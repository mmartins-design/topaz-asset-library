import "server-only";
import { del, list, put } from "@vercel/blob";
import { fetchDriveMedia, fetchDriveThumb } from "./sources/drive";
import type { Archive, Library, MediaFile } from "./types";

/**
 * Mirrors the Drive library into Vercel Blob so downloads, video playback and
 * previews come straight from Vercel's CDN instead of Drive → function → visitor.
 *
 * Layout (the version segment changes when a Drive file changes, so CDN caches never go stale):
 *   files/<driveId>/<version>/<download-name>   original file
 *   previews/<driveId>/<version>/w800.jpg       pre-sized previews (images and video stills)
 *   previews/<driveId>/<version>/w2000.jpg
 */

export const PREVIEW_WIDTHS = [800, 2000] as const;

export function blobConfigured() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

type Servable = MediaFile | Archive;

const ver = (f: Servable) => (f.version ?? "0").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "0";
const filePath = (f: Servable) => `files/${f.id}/${ver(f)}/${f.downloadName ?? f.name}`;
const previewPath = (f: Servable, w: number) => `previews/${f.id}/${ver(f)}/w${w}.jpg`;

function servables(lib: Library) {
  const files = new Map<string, MediaFile>();
  const archives: Archive[] = [];
  for (const a of lib.assets) {
    for (const f of [...a.files, a.poster, a.before, a.after]) if (f) files.set(f.id, f);
    if (a.archive) archives.push(a.archive);
  }
  return { files: [...files.values()], archives };
}

async function listAll(): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) urls.set(b.pathname, b.url);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return urls;
}

/** Adds CDN URLs to every file that has already been mirrored. Unsynced files keep using the API routes. */
export async function attachCdn(lib: Library): Promise<Library> {
  const urls = await listAll();
  const { files, archives } = servables(lib);
  for (const f of [...files, ...archives]) {
    const cdn = {
      src: urls.get(filePath(f)),
      w800: urls.get(previewPath(f, 800)),
      w2000: urls.get(previewPath(f, 2000)),
    };
    if (cdn.src || cdn.w800 || cdn.w2000) f.cdn = cdn;
  }
  return lib;
}

type Job =
  | { pathname: string; type: "file"; file: Servable; contentType?: string }
  | { pathname: string; type: "preview"; file: Servable; width: number };

export interface SyncResult {
  done: boolean;
  uploaded: number;
  failed: { pathname: string; error: string }[];
  remaining: number;
  deleted: number;
  pendingAtStart: number;
  ms: number;
}

/**
 * Uploads whatever is missing, then deletes blobs for removed or replaced files.
 * Stops starting new uploads after `budgetMs`; run again to continue (it's incremental).
 */
export async function syncToBlob(lib: Library, budgetMs = 240_000): Promise<SyncResult> {
  const started = Date.now();
  const { files, archives } = servables(lib);
  const jobs: Job[] = [];
  for (const f of files) {
    jobs.push({ pathname: filePath(f), type: "file", file: f, contentType: f.mimeType });
    for (const width of PREVIEW_WIDTHS) jobs.push({ pathname: previewPath(f, width), type: "preview", file: f, width });
  }
  for (const a of archives) jobs.push({ pathname: filePath(a), type: "file", file: a, contentType: "application/zip" });

  const existing = await listAll();
  const wanted = new Set(jobs.map((j) => j.pathname));
  // Small previews first so the grid speeds up soonest; big videos and zips last.
  const queue = jobs
    .filter((j) => !existing.has(j.pathname))
    .sort((a, b) => (a.type === "preview" ? 0 : (a.file.size ?? 0)) - (b.type === "preview" ? 0 : (b.file.size ?? 0)));
  const total = queue.length;

  let uploaded = 0;
  const failed: SyncResult["failed"] = [];

  const upload = async (job: Job) => {
    const res =
      job.type === "file" ? await fetchDriveMedia(job.file.id, null) : await fetchDriveThumb(job.file.id, job.width);
    if (!res?.ok || !res.body) throw new Error(res ? `Drive ${res.status}` : "No Drive thumbnail");
    await put(job.pathname, res.body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: job.type === "file" ? job.contentType : res.headers.get("content-type") ?? "image/jpeg",
      cacheControlMaxAge: 60 * 60 * 24 * 365, // paths are versioned, so they can be cached for a year
      multipart: job.type === "file" && (job.file.size ?? 0) > 50 * 1024 * 1024,
    });
  };

  const worker = async () => {
    while (queue.length && Date.now() - started < budgetMs) {
      const job = queue.shift()!;
      try {
        await upload(job);
        uploaded++;
      } catch (err) {
        failed.push({ pathname: job.pathname, error: err instanceof Error ? err.message : String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  // Only clean up once everything current is uploaded, so nothing is ever missing.
  let deleted = 0;
  const done = queue.length === 0 && failed.length === 0;
  if (done) {
    const stale = [...existing.entries()]
      .filter(([pathname]) => /^(files|previews)\//.test(pathname) && !wanted.has(pathname))
      .map(([, url]) => url);
    for (let i = 0; i < stale.length; i += 100) await del(stale.slice(i, i + 100));
    deleted = stale.length;
  }

  return {
    done,
    uploaded,
    failed,
    remaining: queue.length,
    deleted,
    pendingAtStart: total,
    ms: Date.now() - started,
  };
}

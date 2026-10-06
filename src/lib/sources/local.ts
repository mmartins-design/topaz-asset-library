import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { imageSizeFromFile } from "image-size/fromFile";
import type { TreeFile, TreeFolder } from "../types";

/**
 * Development fallback: reads a local copy of the library (LOCAL_LIBRARY_PATH)
 * so the site can be worked on without Google credentials.
 */

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

export function localConfigured() {
  return !!process.env.LOCAL_LIBRARY_PATH;
}

const rootDir = () => path.resolve(process.env.LOCAL_LIBRARY_PATH!);
const encode = (rel: string) => Buffer.from(rel).toString("base64url");

export function localPath(id: string): string | null {
  const root = rootDir();
  const full = path.resolve(root, Buffer.from(id, "base64url").toString("utf8"));
  return full.startsWith(root + path.sep) ? full : null;
}

export function localMime(file: string) {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

async function readFolder(dir: string): Promise<TreeFolder> {
  const root = rootDir();
  const stat = await fs.promises.stat(dir);
  const folder: TreeFolder = {
    id: encode(path.relative(root, dir)),
    name: path.basename(dir),
    createdTime: stat.birthtime.toISOString(),
    files: [],
    folders: [],
  };
  for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      folder.folders.push(await readFolder(full));
      continue;
    }
    const mimeType = localMime(full);
    if (mimeType === "application/octet-stream") continue;
    const s = await fs.promises.stat(full);
    const file: TreeFile = {
      id: encode(path.relative(root, full)),
      name: entry.name,
      mimeType,
      size: s.size,
      createdTime: s.birthtime.toISOString(),
    };
    if (mimeType.startsWith("image/")) {
      try {
        const dim = await imageSizeFromFile(full);
        const rotated = (dim.orientation ?? 1) >= 5;
        file.width = rotated ? dim.height : dim.width;
        file.height = rotated ? dim.width : dim.height;
      } catch {}
    }
    folder.files.push(file);
  }
  return folder;
}

export function readLocalTree(): Promise<TreeFolder> {
  return readFolder(rootDir());
}

/** Serves a local file with HTTP Range support. */
export async function localMediaResponse(id: string, range: string | null, extra: HeadersInit): Promise<Response> {
  const file = localPath(id);
  if (!file || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const { size } = await fs.promises.stat(file);
  const headers = new Headers(extra);
  headers.set("Content-Type", localMime(file));
  headers.set("Accept-Ranges", "bytes");

  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : size - Number(m[2]);
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { status: 200, headers });
}

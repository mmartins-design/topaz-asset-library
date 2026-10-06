import type { Asset, Library, MediaFile, MediaKind, TreeFile, TreeFolder } from "./types";

/**
 * Turns a raw folder tree into gallery assets.
 *
 * Folder conventions (matches the existing "Topaz Asset Library" layout):
 *   Topaz Asset Library/
 *     Images/ and Videos/           → optional media-type grouping (not a model)
 *     <Model>/                      → one entry in the model dropdown; "A, B" means both A and B
 *       loose-file.jpg              → its own asset
 *       <any sub-folders>/          → grouping only (shown as a breadcrumb)
 *         <set folder>/             → a folder holding media files is one "image set"
 *           original.jpg            → "before" (name contains before/original, or is the
 *           original-topaz-v4.jpg     shortest name that the other files start with)
 *           _thumb.webp             → optional grid thumbnail (name contains "thumb")
 *           download.zip            → optional download package
 *           _dam/ or compare/       → optional curated before/after pair
 *           Metadata.json           → optional Webflow record: Name, Model, Tags, Created On
 *
 * A folder with more than COLLECTION_THRESHOLD media files is treated as a
 * collection: each file becomes its own asset.
 */

const COLLECTION_THRESHOLD = 6;
const CURATED_FOLDER = /^(_dam|compare)$/i;
const THUMB = /thumb/i;
const BEFORE = /(^|[^a-z])(before|original)([^a-z]|$)/i;
const AFTER = /(^|[^a-z])after([^a-z]|$)/i;
const TYPE_FOLDER = /^(images?|photos?|videos?)$/i;

const splitModels = (s: string) => s.split(/\s*,\s*/).map((m) => m.trim()).filter(Boolean);
const splitList = (s?: string) =>
  (s ?? "")
    .split(/\s*;\s*/)
    .map((t) => t.replace(/-[0-9a-f]{5}$/i, "").replace(/-/g, " ").trim())
    .filter(Boolean);

function isoDate(s: string | undefined, fallback: string) {
  const t = s ? Date.parse(s.replace(/\s*\(.*\)$/, "")) : NaN;
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
}

export function mediaKind(mimeType: string): MediaKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

const isArchive = (f: TreeFile) => f.mimeType === "application/zip" || /\.zip$/i.test(f.name);
const stem = (name: string) => name.replace(/\.[^.]+$/, "");
const isHidden = (name: string) => name.startsWith(".");

function toMedia(f: TreeFile): MediaFile | null {
  const kind = mediaKind(f.mimeType);
  if (!kind) return null;
  return { id: f.id, name: f.name, kind, mimeType: f.mimeType, width: f.width, height: f.height, size: f.size };
}

/** "01-yellow-bird-on-a-branch" → "Yellow bird on a branch" */
export function humanize(name: string): string {
  const s = stem(name)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/(^|[_\s-])[0-9a-f]{16,}(?=[_\s-]|$)/gi, "$1")
    .replace(/\s*\[[0-9a-f]{6,}\]$/i, "")
    .replace(/^[_\s-]*\d+[_-]+(?=[a-z])/i, "")
    .replace(/^[_\s-]+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Folder names like "9", "_7", "2001" carry no meaning on their own. */
const isGenericName = (name: string) => /^[_\s-]*\d*[_\s-]*$/.test(name);

function detectPair(files: MediaFile[]): { before?: MediaFile; after?: MediaFile } {
  if (files.length < 2) return {};
  let before = files.find((f) => BEFORE.test(stem(f.name)));
  let after = files.find((f) => f !== before && AFTER.test(stem(f.name)));

  if (!before) {
    const byLength = [...files].sort((a, b) => stem(a.name).length - stem(b.name).length);
    before = byLength.find((f) =>
      files.some((o) => o !== f && o.kind === f.kind && stem(o.name).startsWith(stem(f.name))),
    );
  }
  if (before && !after) {
    const candidates = files.filter((f) => f !== before && f.kind === before!.kind);
    const derived = candidates.filter((f) => stem(f.name).startsWith(stem(before!.name)));
    // Prefer the most-processed derivative (longest suffix), e.g. "-dust-focus" over "-dust".
    after = (derived.length ? derived : candidates).sort((a, b) => b.name.length - a.name.length)[0];
  }
  if (before && after && before.kind === after.kind) return { before, after };

  // No naming hints: Topaz output is usually higher resolution than its source.
  const sized = files.filter((f) => f.kind === (after ?? files[0]).kind && f.width && f.height);
  const area = (f: MediaFile) => f.width! * f.height!;
  if (after && sized.length === 2 && sized.includes(after)) {
    return { before: sized.find((f) => f !== after), after };
  }
  if (sized.length >= 2) {
    const [small, ...rest] = [...sized].sort((a, b) => area(a) - area(b));
    const large = after ?? rest[rest.length - 1];
    if (area(large) >= area(small) * 1.5) return { before: small, after: large };
  }
  return {};
}

function singleAsset(f: TreeFile, model: string, path: string[], poster?: MediaFile): Asset | null {
  const m = toMedia(f);
  if (!m) return null;
  return {
    id: f.id,
    title: humanize(f.name),
    models: splitModels(model),
    tags: [],
    path,
    kind: m.kind,
    cover: m,
    poster,
    files: [m],
    createdTime: f.createdTime,
  };
}

function setAsset(folder: TreeFolder, model: string, path: string[]): Asset | null {
  const meta = folder.metadata;
  if (meta?.Archived === "true" || meta?.Draft === "true") return null;

  const own = folder.files.map(toMedia).filter((m): m is MediaFile => !!m);
  const curatedFolder = folder.folders.find((f) => CURATED_FOLDER.test(f.name));
  const curated = (curatedFolder?.files ?? []).map(toMedia).filter((m): m is MediaFile => !!m);

  const thumbs = own.filter((m) => m.kind === "image" && THUMB.test(m.name));
  const content = own.filter((m) => !thumbs.includes(m));
  // Curated files often duplicate the parent's; keep the parent copy.
  for (const c of curated) if (!content.some((m) => m.name === c.name)) content.push(c);
  if (!content.length && !thumbs.length) return null;

  const curatedPair = curated.length >= 2 ? detectPair(curated) : {};
  const { before, after } = curatedPair.after ? curatedPair : detectPair(content);
  const kind: MediaKind = content.some((m) => m.kind === "video") ? "video" : "image";
  const sameKind = content.filter((m) => m.kind === kind);
  const cover =
    after ??
    [...sameKind].sort((a, b) => b.name.length - a.name.length)[0] ??
    thumbs[0];

  const archiveFile = folder.files.find(isArchive);
  const title =
    meta?.Name?.trim() ? meta.Name.trim()
    : !isGenericName(folder.name) ? humanize(folder.name)
    : archiveFile && !isGenericName(stem(archiveFile.name)) ? humanize(archiveFile.name)
    : humanize((before ?? cover).name);

  const files = [cover, ...content.filter((m) => m !== cover)];
  return {
    id: folder.id,
    title,
    models: splitModels(meta?.Model || model),
    tags: [...splitList(meta?.Tags), ...splitList(meta?.Product)],
    path,
    kind,
    cover,
    poster: thumbs[0],
    before,
    after,
    files,
    archive: archiveFile ? { id: archiveFile.id, name: archiveFile.name, size: archiveFile.size } : undefined,
    createdTime: isoDate(meta?.["Created On"], folder.createdTime),
  };
}

function walk(folder: TreeFolder, model: string, path: string[], isModelRoot: boolean, out: Asset[]) {
  const media = folder.files.filter((f) => mediaKind(f.mimeType));
  const hasCurated = folder.folders.some((f) => CURATED_FOLDER.test(f.name));
  const subPath = isModelRoot ? path : [...path, folder.name];

  if (isModelRoot || media.length > COLLECTION_THRESHOLD) {
    // Loose files: videos with a matching "<name> - thumbnail.jpg" get it as poster.
    const thumbFor = new Map<string, TreeFile>();
    for (const f of media) {
      const m = /^(.*?)\s*-\s*thumbnail$/i.exec(stem(f.name));
      if (m && mediaKind(f.mimeType) === "image") thumbFor.set(m[1].toLowerCase(), f);
    }
    const posterFor = (f: TreeFile) => {
      const key = [...thumbFor.keys()].find((k) => stem(f.name).toLowerCase().startsWith(k));
      return key ? toMedia(thumbFor.get(key)!) ?? undefined : undefined;
    };
    const used = new Set<TreeFile>(thumbFor.values());

    // "clip.mp4" + "clip_SLF2.mp4" side by side → one before/after asset.
    const byLength = [...media].sort((a, b) => stem(a.name).length - stem(b.name).length);
    for (const f of byLength) {
      if (used.has(f)) continue;
      const derived = byLength.find(
        (g) =>
          g !== f &&
          !used.has(g) &&
          mediaKind(g.mimeType) === mediaKind(f.mimeType) &&
          stem(g.name).startsWith(stem(f.name)) &&
          /^[_\s-]/.test(stem(g.name).slice(stem(f.name).length)),
      );
      if (!derived) continue;
      used.add(f).add(derived);
      const before = toMedia(f)!;
      const after = toMedia(derived)!;
      out.push({
        id: derived.id,
        title: humanize(f.name),
        models: splitModels(model),
        tags: [],
        path: subPath,
        kind: after.kind,
        cover: after,
        poster: posterFor(f),
        before,
        after,
        files: [after, before],
        createdTime: derived.createdTime,
      });
    }

    for (const f of media) {
      if (used.has(f)) continue;
      const a = singleAsset(f, model, subPath, posterFor(f));
      if (a) out.push(a);
    }
    for (const sub of folder.folders) if (!isHidden(sub.name)) walk(sub, model, subPath, false, out);
    return;
  }

  if (media.length || hasCurated) {
    const a = setAsset(folder, model, path);
    if (a) out.push(a);
    for (const sub of folder.folders) {
      if (!isHidden(sub.name) && !CURATED_FOLDER.test(sub.name)) walk(sub, model, subPath, false, out);
    }
    return;
  }

  for (const sub of folder.folders) if (!isHidden(sub.name)) walk(sub, model, subPath, false, out);
}

export function buildLibrary(root: TreeFolder, source: Library["source"]): Library {
  const assets: Asset[] = [];
  const modelFolders = root.folders.flatMap((f) => (TYPE_FOLDER.test(f.name) ? f.folders : [f]));
  for (const modelFolder of modelFolders) {
    if (isHidden(modelFolder.name)) continue;
    walk(modelFolder, modelFolder.name, [], true, assets);
  }
  assets.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  const models = [...new Set(assets.flatMap((a) => a.models))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return { assets, models, source, updatedAt: new Date().toISOString() };
}

/** Attaches a URL signature to every servable file (see lib/sign.ts). */
export function signLibrary(lib: Library, sign: (id: string) => string): Library {
  const seen = new Set<object>();
  const signFile = <T extends { id: string; sig?: string }>(f: T | undefined) => {
    if (f && !seen.has(f)) {
      seen.add(f);
      f.sig = sign(f.id);
    }
  };
  for (const a of lib.assets) {
    a.files.forEach(signFile);
    [a.cover, a.poster, a.before, a.after, a.archive].forEach(signFile);
  }
  return lib;
}

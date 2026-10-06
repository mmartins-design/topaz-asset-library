import type { Asset, CdnUrls, MediaFile } from "./types";

type Servable = { id: string; sig?: string; name: string; downloadName?: string; cdn?: CdnUrls };
const q = (f: Servable) => `s=${f.sig ?? ""}`;

// Files mirrored to Vercel Blob are served from its CDN; anything not synced yet
// falls back to the /api routes, which stream from Google Drive.

export const mediaUrl = (f: Servable) => f.cdn?.src ?? `/api/media/${encodeURIComponent(f.id)}?${q(f)}`;

export function thumbUrl(f: Servable, w = 800) {
  const cdn = w <= 800 ? (f.cdn?.w800 ?? f.cdn?.w2000) : (f.cdn?.w2000 ?? f.cdn?.w800);
  return cdn ?? `/api/thumb/${encodeURIComponent(f.id)}?w=${w}&${q(f)}`;
}

export function downloadUrl(f: Servable) {
  if (f.cdn?.src) return `${f.cdn.src}?download=1`;
  return `/api/media/${encodeURIComponent(f.id)}?${q(f)}&download=${encodeURIComponent(f.downloadName ?? f.name)}`;
}

export const assetPath = (a: Asset) => `/asset/${a.slug}`;

/**
 * Starts downloading the previews the detail view opens with, so it appears
 * instantly. Called on card hover and for the modal's neighbours.
 */
const warmed = new Set<string>();
export function warmAsset(a: Asset) {
  if (typeof window === "undefined") return;
  const files = a.before && a.after ? [a.before, a.after] : [a.cover];
  for (const f of files) {
    if (f.kind !== "image" || warmed.has(f.id)) continue;
    warmed.add(f.id);
    new Image().src = thumbUrl(f, 800);
  }
}

/** The image shown for an asset in the grid. */
export const displayFile = (a: Asset): MediaFile => a.poster ?? a.cover;

export function aspectOf(f: MediaFile | undefined, fallback = 4 / 3) {
  return f?.width && f?.height ? f.width / f.height : fallback;
}

/** Main download for a card: the set's .zip if it has one, else the cover file. */
export function primaryDownload(a: Asset) {
  return a.archive
    ? { href: downloadUrl(a.archive), label: "Download set (.zip)" }
    : { href: downloadUrl(a.cover), label: "Download" };
}

export function formatBytes(n?: number) {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

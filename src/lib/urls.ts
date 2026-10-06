import type { Asset, MediaFile } from "./types";

export const mediaUrl = (id: string) => `/api/media/${encodeURIComponent(id)}`;
export const thumbUrl = (id: string, w = 800) => `/api/thumb/${encodeURIComponent(id)}?w=${w}`;
export const downloadUrl = (id: string, name: string) => `${mediaUrl(id)}?download=${encodeURIComponent(name)}`;

/** The image shown for an asset in the grid. */
export const displayFile = (a: Asset): MediaFile => a.poster ?? a.cover;

export function aspectOf(f: MediaFile | undefined, fallback = 4 / 3) {
  return f?.width && f?.height ? f.width / f.height : fallback;
}

/** Main download for a card: the set's .zip if it has one, else the cover file. */
export function primaryDownload(a: Asset) {
  return a.archive
    ? { href: downloadUrl(a.archive.id, a.archive.name), label: "Download set (.zip)" }
    : { href: downloadUrl(a.cover.id, a.cover.name), label: "Download" };
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

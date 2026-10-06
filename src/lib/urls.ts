import type { Asset, MediaFile } from "./types";

type Servable = { id: string; sig?: string };
const q = (f: Servable) => `s=${f.sig ?? ""}`;

export const mediaUrl = (f: Servable) => `/api/media/${encodeURIComponent(f.id)}?${q(f)}`;
export const thumbUrl = (f: Servable, w = 800) => `/api/thumb/${encodeURIComponent(f.id)}?w=${w}&${q(f)}`;
export const downloadUrl = (f: Servable, name: string) => `${mediaUrl(f)}&download=${encodeURIComponent(name)}`;

/** The image shown for an asset in the grid. */
export const displayFile = (a: Asset): MediaFile => a.poster ?? a.cover;

export function aspectOf(f: MediaFile | undefined, fallback = 4 / 3) {
  return f?.width && f?.height ? f.width / f.height : fallback;
}

/** Main download for a card: the set's .zip if it has one, else the cover file. */
export function primaryDownload(a: Asset) {
  return a.archive
    ? { href: downloadUrl(a.archive, a.archive.name), label: "Download set (.zip)" }
    : { href: downloadUrl(a.cover, a.cover.name), label: "Download" };
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

export type MediaKind = "image" | "video";

/** A single image or video file. */
export interface MediaFile {
  id: string;
  /** Signature that authorizes /api/media and /api/thumb to serve this file. */
  sig?: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
}

/**
 * One card in the grid. Either a single file, or an "image set" folder
 * (e.g. an original + the Topaz-processed result, plus an optional .zip).
 */
export interface Asset {
  id: string;
  title: string;
  /** Models used, e.g. ["Dust & Scratch", "Super Focus"] (from Metadata.json or the model folder). */
  models: string[];
  /** Search keywords from Metadata.json "Tags" and "Product". */
  tags: string[];
  /** Sub-folders between the model folder and the asset, e.g. ["GenAI"]. */
  path: string[];
  kind: MediaKind;
  /** The file that represents the asset (the "after" when there is one). */
  cover: MediaFile;
  /** Optional designed thumbnail image shown in the grid instead of the cover. */
  poster?: MediaFile;
  before?: MediaFile;
  after?: MediaFile;
  /** Every media file in the set, cover first. */
  files: MediaFile[];
  /** A .zip download package found in the set folder. */
  archive?: { id: string; sig?: string; name: string; size?: number };
  createdTime: string;
}

export interface Library {
  assets: Asset[];
  models: string[];
  source: "drive" | "local" | "none";
  updatedAt: string;
  error?: string;
}

/** Raw folder tree, produced by a source (Google Drive or local disk). */
export interface TreeFile {
  id: string;
  name: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
  createdTime: string;
}

export interface TreeFolder {
  id: string;
  name: string;
  createdTime: string;
  files: TreeFile[];
  folders: TreeFolder[];
  /** Parsed Metadata.json from this folder (Webflow CMS export), if present. */
  metadata?: Record<string, string>;
}

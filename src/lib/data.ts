import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { buildLibrary, servableIds } from "./library";
import { driveConfigured, readDriveTree } from "./sources/drive";
import { localConfigured, readLocalTree } from "./sources/local";
import type { Library } from "./types";

/** How often (seconds) the site re-reads Google Drive. */
export const REFRESH_SECONDS = 300;

export function activeSource(): Library["source"] {
  if (driveConfigured()) return "drive";
  if (localConfigured()) return "local";
  return "none";
}

async function loadLibrary(): Promise<Library> {
  const source = activeSource();
  if (source === "none") {
    return {
      assets: [],
      models: [],
      source,
      updatedAt: new Date().toISOString(),
      error: "No library source configured. Set GOOGLE_SERVICE_ACCOUNT_KEY (see README).",
    };
  }
  const tree = source === "drive" ? await readDriveTree() : await readLocalTree();
  return buildLibrary(tree, source);
}

/**
 * The whole library, cached for REFRESH_SECONDS and tagged "library" so
 * /api/revalidate can refresh it immediately. Never throws: a Drive failure
 * returns an empty library with `error` set and is retried after a minute.
 */
export async function getLibrary(): Promise<Library> {
  "use cache";
  cacheTag("library");
  try {
    const library = await loadLibrary();
    cacheLife({ stale: 60, revalidate: REFRESH_SECONDS, expire: 60 * 60 * 24 * 7 });
    return library;
  } catch (err) {
    console.error("Failed to load library", err);
    cacheLife({ stale: 60, revalidate: 60, expire: 60 * 10 });
    return {
      assets: [],
      models: [],
      source: activeSource(),
      updatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function isServable(id: string): Promise<boolean> {
  return servableIds(await getLibrary()).has(id);
}

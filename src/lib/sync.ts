import "server-only";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { blobConfigured, syncToBlob } from "./blob";
import { activeSource, loadLibrary } from "./data";

export const syncAvailable = () => activeSource() === "drive" && blobConfigured();

export async function runSync() {
  const result = await syncToBlob(await loadLibrary());
  // Pick up the new CDN URLs right away.
  if (result.uploaded || result.deleted) {
    revalidateTag("library", { expire: 0 });
    revalidatePath("/", "layout");
  }
  return result;
}

/** Runs a sync after the current response has been sent. */
export function syncInBackground() {
  if (syncAvailable()) after(() => runSync().catch((err) => console.error("Background sync failed", err)));
}

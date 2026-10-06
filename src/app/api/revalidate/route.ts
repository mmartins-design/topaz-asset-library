import { revalidatePath, revalidateTag } from "next/cache";
import { syncInBackground } from "@/lib/sync";

// Leaves time for the background Blob sync this triggers.
export const maxDuration = 300;

/**
 * Forces an immediate refresh from Google Drive instead of waiting for the
 * 5-minute auto refresh, then copies any new files to the CDN in the background:
 * GET/POST /api/revalidate?secret=<REVALIDATE_SECRET>
 */
async function handle(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || new URL(req.url).searchParams.get("secret") !== secret) {
    return Response.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  revalidateTag("library", { expire: 0 });
  revalidatePath("/", "layout");
  syncInBackground();
  return Response.json({ ok: true, revalidatedAt: new Date().toISOString(), cdnSync: "started in background" });
}

export const GET = handle;
export const POST = handle;

import { blobConfigured } from "@/lib/blob";
import { activeSource } from "@/lib/data";
import { runSync, syncAvailable } from "@/lib/sync";

// The first sync copies the whole library; later runs only copy what changed.
export const maxDuration = 300;

/**
 * Copies Drive files into Vercel Blob (see lib/blob.ts).
 * Runs daily via Vercel Cron (Authorization: Bearer CRON_SECRET), after every
 * /api/revalidate call, or manually: /api/sync?secret=<REVALIDATE_SECRET>.
 * If a run reports "done": false, it ran out of time; run it again to continue.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!syncAvailable()) {
    const missing = [
      activeSource() !== "drive" && "Google Drive (GOOGLE_SERVICE_ACCOUNT_KEY)",
      !blobConfigured() &&
        "Vercel Blob token (no BLOB_READ_WRITE_TOKEN in this deployment: connect the Blob store to the Production environment, then redeploy)",
    ].filter(Boolean);
    return Response.json({ ok: false, error: `Sync is missing: ${missing.join("; ")}` }, { status: 400 });
  }
  return Response.json({ ok: true, ...(await runSync()) });
}

function authorized(req: Request) {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  const secret = process.env.REVALIDATE_SECRET;
  return !!secret && new URL(req.url).searchParams.get("secret") === secret;
}

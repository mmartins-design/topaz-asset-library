import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Forces an immediate refresh from Google Drive instead of waiting for the
 * 5-minute auto refresh: GET/POST /api/revalidate?secret=<REVALIDATE_SECRET>
 */
async function handle(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || new URL(req.url).searchParams.get("secret") !== secret) {
    return Response.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  revalidateTag("library", { expire: 0 });
  revalidatePath("/");
  return Response.json({ ok: true, revalidatedAt: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;

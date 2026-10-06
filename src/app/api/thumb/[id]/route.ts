import { activeSource, isServable } from "@/lib/data";
import { fetchDriveMedia, fetchDriveThumb } from "@/lib/sources/drive";
import { localMediaResponse } from "@/lib/sources/local";

const WIDTHS = [400, 800, 1200, 2000];
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

/** Resized preview image (?w=400|800|1200|2000). Videos get a still frame. */
export async function GET(req: Request, ctx: RouteContext<"/api/thumb/[id]">) {
  const { id } = await ctx.params;
  if (!(await isServable(id))) return new Response("Not found", { status: 404 });

  const requested = Number(new URL(req.url).searchParams.get("w")) || 800;
  const width = WIDTHS.find((w) => w >= requested) ?? WIDTHS.at(-1)!;

  // Local dev: no resizing, just serve the original.
  if (activeSource() === "local") return localMediaResponse(id, null, { "Cache-Control": CACHE });

  const thumb = await fetchDriveThumb(id, width);
  const res = thumb ?? (await fetchDriveMedia(id, null));
  if (!res.ok) return new Response("Upstream error", { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": CACHE,
    },
  });
}

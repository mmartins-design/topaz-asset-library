import { activeSource, isServable } from "@/lib/data";
import { fetchDriveMedia } from "@/lib/sources/drive";
import { localMediaResponse } from "@/lib/sources/local";

/**
 * Full-resolution file bytes. Supports Range requests (video seeking) and
 * ?download=<filename> to save the file instead of displaying it.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  if (!(await isServable(id))) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const download = url.searchParams.get("download");
  const range = req.headers.get("range");
  const extra: Record<string, string> = {
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  };
  if (download) {
    extra["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(download)}`;
  }

  if (activeSource() === "local") return localMediaResponse(id, range, extra);

  const upstream = await fetchDriveMedia(id, range);
  if (!upstream.ok) return new Response("Upstream error", { status: upstream.status });
  const headers = new Headers(extra);
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  return new Response(upstream.body, { status: upstream.status, headers });
}

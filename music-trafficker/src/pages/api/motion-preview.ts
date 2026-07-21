import type { APIRoute } from "astro";
import { getMotionPreviewUrl, YT_UA } from "../../server/youtube";

/**
 * Proxies a video's animated hover-preview (an_webp — ~3s of real consecutive
 * frames). Upstream sends no CORS headers, so the browser can't decode it
 * cross-origin.
 */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("v") ?? "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return new Response("bad id", { status: 400 });
  }
  const previewUrl = await getMotionPreviewUrl(id);
  if (!previewUrl) return new Response("no motion preview", { status: 404 });

  const upstream = await fetch(previewUrl, {
    headers: { "User-Agent": YT_UA },
  });
  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/webp",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};

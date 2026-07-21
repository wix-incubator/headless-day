import type { APIRoute } from "astro";
import { getStoryboardEntry, YT_UA } from "../../server/youtube";

/**
 * Proxies a video's storyboard sprite sheet (i.ytimg.com serves them without
 * CORS headers, so the browser can't use them as WebGL textures directly).
 * Long CDN cache — the sheet for a given video never changes.
 */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("v") ?? "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return new Response("bad id", { status: 400 });
  }
  const entry = await getStoryboardEntry(id);
  if (!entry.sheetUrl) return new Response("no storyboard", { status: 404 });

  const upstream = await fetch(entry.sheetUrl, {
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

// Parse wix:image://v1/{mediaId}/{filename}#... → mediaId
function extractWixMediaId(wixUrl: string): string | null {
  // Format: wix:image://v1/5477bb_abc~mv2.jpeg/filename.jpeg#originWidth=...
  const match = wixUrl.match(/^wix:image:\/\/v1\/([^/]+)/);
  return match ? match[1] : null;
}

function buildWixStaticUrl(mediaId: string, width?: number, height?: number): string {
  const params = new URLSearchParams();
  if (width)  params.set("w", String(width));
  if (height) params.set("h", String(height));
  const qs = params.toString();
  return `https://static.wixstatic.com/media/${mediaId}${qs ? `?${qs}` : ""}`;
}

export function resolveWixImageUrl(
  image: string | { id?: string; url?: string } | undefined,
  width?: number,
  height?: number,
): string | null {
  if (!image) return null;

  const raw = typeof image === "string" ? image : (image.url ?? undefined);

  if (raw?.startsWith("wix:image://")) {
    const id = extractWixMediaId(raw);
    if (id) return buildWixStaticUrl(id, width, height);
    return null;
  }

  if (raw?.startsWith("http")) {
    if (width || height) {
      const url = new URL(raw);
      if (width)  url.searchParams.set("w", String(width));
      if (height) url.searchParams.set("h", String(height));
      return url.toString();
    }
    return raw;
  }

  // Fallback: object with id only
  const id = typeof image === "object" ? image.id : undefined;
  if (id) return buildWixStaticUrl(id, width, height);

  return null;
}

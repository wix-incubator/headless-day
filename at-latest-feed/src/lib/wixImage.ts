const WIXSTATIC_MEDIA_RE =
  /^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)/;

/** Display sizes tuned for the dashboard card grid and modal hero. */
const VARIANT_SIZES = {
  card: {
    width: 640,
    height: 360,
    retina: { width: 1280, height: 720 },
    sizes: "(max-width: 768px) 92vw, 320px",
  },
  hero: {
    width: 1280,
    height: 549,
    retina: { width: 2560, height: 1098 },
    sizes: "(max-width: 768px) 92vw, 1120px",
  },
} as const;

export type TrendCoverVariant = keyof typeof VARIANT_SIZES;

export interface TrendCoverImageSources {
  src: string;
  srcSet: string;
  sizes: string;
}

/** Extract the media file id from a Wix static URL (ignores any existing transforms). */
export function wixMediaFileId(url: string): string | null {
  const match = url.match(WIXSTATIC_MEDIA_RE);
  return match?.[1] ?? null;
}

/** Build a Wix CDN fill URL with auto-encoded WebP/JPEG delivery. */
export function wixFillImageUrl(
  url: string,
  width: number,
  height: number,
  filename: string,
): string | null {
  const fileId = wixMediaFileId(url);
  if (!fileId) return null;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "cover";
  return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${width},h_${height},al_c,q_80,enc_auto/${safeName}.webp`;
}

/** Optimized src + retina srcset for trend cover images stored on Wix Media. */
export function getTrendCoverImageSources(
  url: string,
  variant: TrendCoverVariant,
  filename: string,
): TrendCoverImageSources | null {
  const spec = VARIANT_SIZES[variant];
  const src = wixFillImageUrl(url, spec.width, spec.height, filename);
  const retina = wixFillImageUrl(
    url,
    spec.retina.width,
    spec.retina.height,
    filename,
  );

  if (!src || !retina) return null;

  return {
    src,
    srcSet: `${src} ${spec.width}w, ${retina} ${spec.retina.width}w`,
    sizes: spec.sizes,
  };
}

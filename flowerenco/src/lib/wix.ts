import { media } from "@wix/sdk";

/**
 * Resolve a Wix media value to a usable <img src>.
 * Handles both `wix:image://` identifiers (need scaling) and already-absolute https URLs.
 */
export function imgSrc(value: any, w = 800, h = 800): string {
  const v = value?.image ?? value?.url ?? value;
  if (!v) return "";
  if (typeof v === "string" && v.startsWith("wix:image://")) {
    return media.getScaledToFillImageUrl(v, w, h, {});
  }
  return typeof v === "string" ? v : (v?.url ?? "");
}

/**
 * Turn a raw static.wixstatic.com PNG URL into a resized, `enc_auto` (WebP/AVIF) URL
 * via the SDK — avoids downloading the full-size original. Falls back to the input on any miss.
 */
export function scaledStatic(url: string, w = 700, h = 700, ow = 1024, oh = 1024, q = 80): string {
  if (!url || typeof url !== "string") return url;
  const m = url.match(/static\.wixstatic\.com\/media\/([^/?#]+)/);
  if (!m) return url;
  const uri = `wix:image://v1/${m[1]}/image.png#originWidth=${ow}&originHeight=${oh}`;
  try {
    const out = media.getScaledToFillImageUrl(uri, w, h, {});
    // Lower the quality factor for smaller downloads (SDK defaults to q_90).
    return out.replace(/,q_\d+,/, `,q_${q},`);
  } catch {
    return url;
  }
}

/** Resolve a Wix Portfolio image (coverImage.imageInfo / item.image.imageInfo — a bare media string). */
export function pfImg(imageInfo?: string | null, w = 900, h = 900): string {
  if (!imageInfo) return "";
  try {
    return media.getScaledToFillImageUrl(imageInfo, w, h, {});
  } catch {
    return "";
  }
}

/** Format a string amount as money. Wix amounts come back as strings. */
export function money(amount?: string | number, currency = "USD"): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

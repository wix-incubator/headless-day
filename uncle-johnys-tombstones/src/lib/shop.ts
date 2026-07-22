// Server-side storefront helpers for Uncle Johny's Tombstones.
// Managed-Astro: authentication is ambient — we import the SDK modules and call
// them directly (no createClient / OAuthStrategy / clientId).
import { productsV3 } from "@wix/stores";
import { httpClient } from "@wix/essentials";
import { media } from "@wix/sdk";

// Wix Stores app id — required as the cart's `catalogReference.appId`.
export const STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  price: string; // raw amount, e.g. "499"
  inStock: boolean;
};

// Resolve a Wix media value to a usable <img src>. Uploaded product media comes
// back as an absolute https URL, but a `wix:image://` identifier can appear once
// brand imagery is attached — handle both, and never emit the raw `wix:image://`
// string (the browser fails it with ERR_UNKNOWN_URL_SCHEME).
export function imgSrc(mediaMain: any, w = 640, h = 640): string {
  if (!mediaMain) return "";
  const candidate =
    mediaMain.image?.url ??
    (typeof mediaMain.image === "string" ? mediaMain.image : undefined) ??
    mediaMain.url ??
    (typeof mediaMain === "string" ? mediaMain : undefined);
  if (!candidate) return "";
  if (candidate.startsWith("wix:image://")) {
    return media.getScaledToFillImageUrl(candidate, w, h, {});
  }
  return candidate;
}

// Products V3 omits the description unless it's explicitly requested, and even
// then `plainDescription` arrives as HTML (e.g. "<p>…</p>") despite its name.
// Ask for the field via the query/get `fields` option, then flatten it to text.
const PRODUCT_FIELDS = ["PLAIN_DESCRIPTION"];

// Turn the HTML in `plainDescription` into readable plain text: block-level tags
// become line breaks, remaining tags are stripped, and common entities decoded.
function htmlToText(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// List the visible products in the catalog. `queryProducts(options)` takes the
// `fields` request; chain .limit().find(). Entity ids are normalized to `_id`.
// Results are sorted by price, cheapest first (numeric sort — `price` is a raw
// amount string, so a lexicographic API sort would misorder e.g. "100" < "20").
export async function getProducts(): Promise<ShopProduct[]> {
  const { items } = await productsV3
    .queryProducts({ fields: PRODUCT_FIELDS } as any)
    .limit(100)
    .find();
  return (items ?? [])
    .map((p: any) => ({
      id: p._id,
      name: p.name ?? "",
      description: htmlToText(p.plainDescription),
      imageUrl: imgSrc(p.media?.main),
      imageAlt: p.media?.main?.image?.altText ?? p.name ?? "",
      price: p.actualPriceRange?.minValue?.amount ?? "",
      inStock: p.inventory?.availabilityStatus === "IN_STOCK",
    }))
    .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
}

// Fetch one product by its id for the product detail page. Returns null when the
// id doesn't resolve (deleted/hidden product) so the page can render a 404.
export async function getProduct(id: string): Promise<ShopProduct | null> {
  try {
    const res: any = await productsV3.getProduct(id, {
      fields: PRODUCT_FIELDS,
    } as any);
    const p = res?.product ?? res;
    if (!p?._id) return null;
    return {
      id: p._id,
      name: p.name ?? "",
      description: htmlToText(p.plainDescription),
      imageUrl: imgSrc(p.media?.main, 1000, 1000),
      imageAlt: p.media?.main?.image?.altText ?? p.name ?? "",
      price: p.actualPriceRange?.minValue?.amount ?? "",
      inStock: p.inventory?.availabilityStatus === "IN_STOCK",
    };
  } catch {
    return null;
  }
}

// The store's payment currency (ISO code). It isn't carried on the product, so
// read it once from site properties. Falls back to USD if the read fails.
let cachedCurrency: string | undefined;
export async function getCurrency(): Promise<string> {
  if (cachedCurrency) return cachedCurrency;
  try {
    const res = await httpClient.fetchWithAuth(
      "https://www.wixapis.com/site-properties/v4/properties",
    );
    const data = await res.json();
    cachedCurrency = data?.properties?.paymentCurrency || "USD";
  } catch {
    cachedCurrency = "USD";
  }
  return cachedCurrency!;
}

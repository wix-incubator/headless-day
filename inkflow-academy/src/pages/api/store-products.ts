import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { media } from "@wix/sdk";
import { productsV3 } from "@wix/stores";
import { json } from "../../lib/json";

export const prerender = false;

const PRODUCT_FIELDS = ["PLAIN_DESCRIPTION"];

function htmlToText(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
}

function imgSrc(mediaMain: unknown, w = 640, h = 640): string {
  const m = mediaMain as {
    image?: { url?: string };
    url?: string;
  };
  const candidate =
    m?.image?.url ??
    (typeof m?.image === "string" ? m.image : undefined) ??
    m?.url ??
    (typeof mediaMain === "string" ? mediaMain : undefined);
  if (!candidate) return "";
  if (candidate.startsWith("wix:image://")) {
    return media.getScaledToFillImageUrl(candidate, w, h, {});
  }
  return candidate;
}

export const GET: APIRoute = async () => {
  try {
    const { items } = await auth
      .elevate(productsV3.queryProducts)({ fields: PRODUCT_FIELDS } as Parameters<
        typeof productsV3.queryProducts
      >[0])
      .limit(20)
      .find();

    const products = (items ?? [])
      .map((p) => {
        const amount = p.actualPriceRange?.minValue?.amount ?? "0";
        const currency = p.actualPriceRange?.minValue?.currency ?? "EUR";
        const priceNum = Math.round(parseFloat(amount) || 0);
        const formatted =
          p.actualPriceRange?.minValue?.formattedAmount ??
          `${currency === "EUR" ? "€" : currency + " "}${priceNum}`;
        return {
          id: p._id as string,
          name: p.name ?? "",
          description: htmlToText((p as { plainDescription?: string }).plainDescription),
          price: priceNum,
          currency,
          formatted,
          image: imgSrc(p.media?.main),
        };
      })
      .sort((a, b) => a.price - b.price);

    return json({ products });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "store-products failed";
    return json({ error: message }, 500);
  }
};

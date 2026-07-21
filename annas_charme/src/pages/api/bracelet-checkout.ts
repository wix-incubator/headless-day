import type { APIRoute } from "astro";
import { checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { auth } from "@wix/essentials";
import { productsV3 } from "@wix/stores";

const elevatedCreateCheckout = auth.elevate(checkout.createCheckout);
const elevatedGetProductBySlug = auth.elevate(productsV3.getProductBySlug);

const KIT_PRODUCT_SLUG = "diy-bracelet-kit";

// Fallback prices (NIS) used when the Wix product is unreachable.
const FALLBACK: Record<string, string> = {
  "Single strand": "40",
  "3 strands": "65",
  "5 strands": "80",
  "7 strands": "95",
  "9 strands": "110",
};

function tierChoiceName(type: string, strandCount: number): string {
  if (type !== "multi") return "Single strand";
  return `${strandCount} strands`;
}

async function fetchKitPrice(type: string, strandCount: number): Promise<string> {
  const target = tierChoiceName(type, strandCount);
  try {
    const { product } = await elevatedGetProductBySlug(KIT_PRODUCT_SLUG, {
      fields: ["VARIANT_OPTION_CHOICE_NAMES"] as any,
    });
    if (product?.variantsInfo?.variants) {
      const variant = product.variantsInfo.variants.find((v) =>
        v.choices?.some((c) => c.optionChoiceNames?.choiceName === target)
      );
      const price = variant?.price?.actualPrice?.amount;
      if (price) return price;
    }
  } catch (e) {
    console.warn("Kit price lookup failed, using fallback:", e);
  }
  return FALLBACK[target] ?? "40";
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { type, strandCount, quantity, kitItems } = body;

    const unitPrice = await fetchKitPrice(String(type), Number(strandCount) || 0);

    const descriptionLines: any[] = [];

    const styleLabel =
      type === "single"
        ? "Single-strand DIY Bracelet Kit"
        : `Multi-strand DIY Bracelet Kit (${strandCount} strands)`;

    descriptionLines.push({
      name: { original: "Style" },
      plainText: { original: styleLabel },
    });

    const items = Array.isArray(kitItems) ? (kitItems as string[]) : [];
    items.forEach((item, i) => {
      descriptionLines.push({
        name: { original: i === 0 ? "Kit includes" : "" },
        plainText: { original: item },
      });
    });

    const newCheckout = await elevatedCreateCheckout({
      channelType: checkout.ChannelType.WEB,
      customLineItems: [
        {
          productName: { original: "DIY Pony Bead Bracelet Kit" },
          price: unitPrice,
          quantity: Math.max(1, Math.min(10, Number(quantity) || 1)),
          itemType: { preset: checkout.ItemTypeItemType.PHYSICAL },
          descriptionLines,
        },
      ],
    });

    const checkoutId =
      (newCheckout as any)?.checkout?._id ?? (newCheckout as any)?._id;

    const { redirectSession } = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId: checkoutId! },
      callbacks: {
        postFlowUrl: "https://annas-char-8f70878b-annaa76.wix-site-host.com/build",
        thankYouPageUrl: "https://annas-char-8f70878b-annaa76.wix-site-host.com/build",
      },
    });

    return new Response(JSON.stringify({ url: redirectSession?.fullUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg =
      e?.details?.applicationError?.description ?? e?.message ?? String(e);
    console.error("Bracelet checkout error:", msg, e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

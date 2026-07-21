import type { APIRoute } from "astro";
import { checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { auth } from "@wix/essentials";

const BUILD_URL = "https://annas-char-8f70878b-annaa76.wix-site-host.com/build";

const PRICES: Record<string, string> = {
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items } = (await request.json()) as { items: any[] };

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items in cart" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const customLineItems: any[] = items.map((item) => {
      const tierName = tierChoiceName(String(item.type), Number(item.strandCount) || 0);
      const unitPrice = PRICES[tierName] ?? "40";

      const styleLabel =
        item.type === "single"
          ? "Single-strand DIY Bracelet Kit"
          : `Multi-strand DIY Bracelet Kit (${item.strandCount} strands)`;

      const descriptionLines: any[] = [
        { name: { original: "Style" }, plainText: { original: styleLabel } },
      ];

      const kitItems = Array.isArray(item.kitItems) ? item.kitItems : [];
      kitItems.forEach((k: string, i: number) => {
        if (descriptionLines.length >= 10) return;
        descriptionLines.push({
          name: { original: i === 0 ? "Kit includes" : "" },
          plainText: { original: k },
        });
      });

      return {
        productName: { original: "DIY Pony Bead Bracelet Kit" },
        price: unitPrice,
        quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)),
        itemType: { preset: checkout.ItemTypeItemType.PHYSICAL },
        descriptionLines,
      };
    });

    const elevatedCreateCheckout = auth.elevate(checkout.createCheckout);
    const newCheckout = await elevatedCreateCheckout({
      channelType: checkout.ChannelType.WEB,
      customLineItems,
    });

    const checkoutId =
      (newCheckout as any)?.checkout?._id ?? (newCheckout as any)?._id;

    const { redirectSession } = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId: checkoutId! },
      callbacks: {
        postFlowUrl: BUILD_URL,
        thankYouPageUrl: BUILD_URL + "?ordered=1",
      },
    });

    return new Response(JSON.stringify({ url: redirectSession?.fullUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const appErr = e?.details?.applicationError;
    const msg =
      appErr?.description ??
      appErr?.code ??
      e?.message ??
      (typeof e === "string" ? e : JSON.stringify(e));
    console.error("Cart checkout error:", msg, e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

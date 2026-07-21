import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
import { isUnavailableCartLineItem } from "../../lib/wix/kit-inventory";

function isWixDiyLine(item: {
  productName?: { original?: string | null } | null;
  url?: string | null;
}): boolean {
  const title = (item.productName?.original ?? "").toLowerCase();
  const handle = item.url?.split("/").pop()?.toLowerCase() ?? "";
  return (
    handle === "diy-bracelet-kit" ||
    (title.includes("diy") &&
      (title.includes("kit") || title.includes("bracelet")))
  );
}

/** Removes legacy Wix catalog DIY kit lines (designs now live in local cart storage). */
export const POST: APIRoute = async () => {
  try {
    const cart = await currentCart.getCurrentCart();
    const diyIds = (cart.lineItems ?? [])
      .filter((item) => !isUnavailableCartLineItem(item))
      .filter(isWixDiyLine)
      .map((item) => item._id!)
      .filter(Boolean);

    if (diyIds.length === 0) {
      return new Response(JSON.stringify({ cleared: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await currentCart.removeLineItemsFromCurrentCart(diyIds);
    return new Response(JSON.stringify({ cleared: diyIds.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ cleared: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

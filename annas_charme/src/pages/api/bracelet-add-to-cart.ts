import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
import {
  ensureKitInventory,
  isUnavailableCartLineItem,
} from "../../lib/wix/kit-inventory";

const WIX_STORES_APP_ID = "1380b703-ce81-ff05-f115-39571d94dfcd";

// POST — adds one bracelet variant to the visitor's Wix cart.
export const POST: APIRoute = async ({ request }) => {
  try {
    const { productId, variantId, quantity } = await request.json();

    if (!productId || !variantId) {
      return new Response(JSON.stringify({ error: "Missing productId or variantId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));

    await ensureKitInventory();

    try {
      const existingCart = await currentCart.getCurrentCart();
      const phantomIds = (existingCart?.lineItems ?? [])
        .filter(isUnavailableCartLineItem)
        .map((item) => item._id!)
        .filter(Boolean);

      if (phantomIds.length > 0) {
        await currentCart.removeLineItemsFromCurrentCart(phantomIds);
      }
    } catch (e: any) {
      if (e?.details?.applicationError?.code !== "OWNED_CART_NOT_FOUND") {
        console.warn("Cart cleanup before add failed:", e?.message ?? e);
      }
    }

    const result = await currentCart.addToCurrentCart({
      lineItems: [
        {
          catalogReference: {
            catalogItemId: productId,
            appId: WIX_STORES_APP_ID,
            options: { variantId },
          },
          quantity: qty,
        } as any,
      ],
    });

    const cart = (result as any)?.cart ?? result;
    const lineItems: any[] = cart?.lineItems ?? [];
    const validItems = lineItems.filter(
      (item: any) => !isUnavailableCartLineItem(item),
    );
    const cartCount = validItems.reduce(
      (a: number, i: any) => a + (i.quantity ?? 0),
      0,
    );

    if (cartCount < 1) {
      return new Response(
        JSON.stringify({
          error:
            "This bracelet kit is currently unavailable. Please try again in a moment.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(
      `Add to cart: productId=${productId} variantId=${variantId} qty=${qty} → cartCount=${cartCount}`,
    );

    const addedItem =
      [...lineItems].reverse().find(
        (item: any) =>
          item.catalogReference?.options?.variantId === variantId &&
          !isUnavailableCartLineItem(item),
      ) ?? validItems.at(-1);

    return new Response(
      JSON.stringify({
        success: true,
        cartCount,
        lineItemId: addedItem?._id ?? null,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    const appErr = e?.details?.applicationError;
    const msg = appErr?.description ?? appErr?.code ?? e?.message ?? String(e);
    console.error("Add to cart error:", JSON.stringify({ code: appErr?.code, msg }));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

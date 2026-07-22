import type { APIRoute } from "astro";
import { readOnlyVariantsV3 } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { STORES_APP_ID } from "../../lib/shop";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function countItems(cart: any): number {
  const lineItems = cart?.lineItems ?? [];
  return lineItems.reduce((n: number, li: any) => n + (li.quantity ?? 0), 0);
}

// Current number of items in the visitor's cart — used to seed the cart badge.
// An empty cart isn't an error; the SDK throws OWNED_CART_NOT_FOUND, so treat
// that as a count of 0.
export const GET: APIRoute = async () => {
  try {
    const cart = await currentCart.getCurrentCart();
    return json({ itemCount: countItems(cart) });
  } catch {
    return json({ itemCount: 0 });
  }
};

// Add a product to the visitor's cart. The visitor identity (and thus the cart)
// is carried by the ambient Wix session, so the same buyer accumulates one cart.
export const POST: APIRoute = async ({ request }) => {
  try {
    const { productId, quantity } = await request.json();
    if (!productId) return json({ error: "Missing productId" }, 400);
    const qty =
      Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    // Resolve the mandatory variantId — variants are a separate read-only
    // resource; queryProducts does not return them. These products are
    // optionless (a single variant), so take the first.
    const { items } = await readOnlyVariantsV3
      .queryVariants()
      .eq("productData.productId", productId)
      .find();
    const variant = items?.[0] as any;
    const variantId = variant?.variantId ?? variant?._id;
    if (!variantId) {
      return json({ error: "No purchasable variant for this product" }, 409);
    }

    const result: any = await currentCart.addToCurrentCart({
      lineItems: [
        {
          quantity: qty,
          catalogReference: {
            catalogItemId: productId,
            appId: STORES_APP_ID,
            options: { variantId },
          },
        },
      ],
    });

    return json({ ok: true, itemCount: countItems(result?.cart ?? result) });
  } catch (err: any) {
    return json({ error: err?.message ?? "Failed to add to cart" }, 500);
  }
};

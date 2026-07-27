import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
const { updateCurrentCartLineItemQuantity, getCurrentCart } = currentCart;

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { lineItemId, quantity } = await request.json();
    if (!lineItemId || quantity == null) return json({ error: "Missing params." }, 400);
    if (quantity < 1) return json({ error: "Quantity must be at least 1." }, 400);

    await updateCurrentCartLineItemQuantity([{ _id: lineItemId, quantity }]);

    let count = quantity;
    try {
      const c = await getCurrentCart();
      count = (c?.lineItems || []).reduce((a: number, l: any) => a + (l.quantity || 1), 0);
    } catch {}

    return json({ ok: true, count });
  } catch (e: any) {
    return json({ error: e?.message || "Could not update cart." }, 500);
  }
};

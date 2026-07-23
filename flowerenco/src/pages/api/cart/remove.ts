import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { lineItemId } = await request.json();
    if (!lineItemId) return json({ error: "Missing line item." }, 400);

    // Find the item's position so we can drop its matching buyer-note line too.
    let idx = -1;
    let noteLines: string[] = [];
    try {
      const cart = await currentCart.getCurrentCart();
      idx = (cart?.lineItems || []).findIndex((li: any) => li._id === lineItemId);
      noteLines = (cart?.buyerNote || "").split("\n");
    } catch {}

    await currentCart.removeLineItemsFromCurrentCart([lineItemId]);

    // Keep the buyer note aligned with the remaining line items.
    if (idx >= 0 && idx < noteLines.length) {
      noteLines.splice(idx, 1);
      try {
        await currentCart.updateCurrentCart({ cartInfo: { buyerNote: noteLines.join("\n") } });
      } catch {}
    }

    let count = 0;
    try {
      const c = await currentCart.getCurrentCart();
      count = (c?.lineItems || []).reduce((a: number, l: any) => a + (l.quantity || 1), 0);
    } catch {}

    return json({ ok: true, count });
  } catch (e: any) {
    return json({ error: e?.message || "Could not remove item." }, 500);
  }
};

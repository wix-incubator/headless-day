import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
import { imgSrc } from "../../../lib/wix";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const GET: APIRoute = async () => {
  try {
    const cart = await currentCart.getCurrentCart();
    const lineItems = (cart?.lineItems || []).map((li: any) => ({
      id: li._id,
      productId: li.catalogReference?.catalogItemId,
      name: li.productName?.original || li.productName || "Vase",
      quantity: li.quantity,
      price: li.price?.amount,
      image: imgSrc(li.image, 240, 240),
    }));
    const count = lineItems.reduce((a: number, l: any) => a + (l.quantity || 1), 0);
    return json({
      lineItems,
      count,
      buyerNote: cart?.buyerNote || "",
      subtotal: cart?.subtotal?.amount ?? cart?.priceSummary?.subtotal?.amount,
      currency: cart?.currency,
    });
  } catch {
    return json({ lineItems: [], count: 0 });
  }
};

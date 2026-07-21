import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";

export const prerender = false;

// Server-side cart count so the nav CartBadge doesn't have to bundle @wix/ecom
// (which pulls the whole Wix SDK onto every page). Runs in the visitor's
// session, so it reflects their cart.
export const GET: APIRoute = async () => {
  try {
    const cart = await currentCart.getCurrentCart();
    const count = (cart.lineItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ count: 0 }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};

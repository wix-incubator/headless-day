import type { APIRoute } from "astro";
import { orders } from "@wix/ecom";
import { auth } from "@wix/essentials";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

// Reads an order's human-readable number. Elevation must happen inside a backend route (not page frontmatter).
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("orderId");
  if (!id) return json({});
  try {
    const getOrder = auth.elevate(orders.getOrder);
    const order = await getOrder(id);
    return json({ number: order?.number ?? null });
  } catch (e: any) {
    return json({ number: null, error: e?.message || "lookup failed" });
  }
};

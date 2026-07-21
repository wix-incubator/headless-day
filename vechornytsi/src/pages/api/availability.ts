import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

export const prerender = false;

// Live seat availability, polled by the Upcoming Dinners page so the
// seats-remaining counts update without a full reload.
export const GET: APIRoute = async () => {
  try {
    const elevatedQuery = auth.elevate(items.query);
    const { items: results } = await elevatedQuery("Dinners")
      .ascending("sortOrder")
      .limit(100)
      .find();

    const dinners = results.map((d: any) => ({
      slug: d.slug,
      seatsAvailable: d.seatsAvailable,
      seatsTotal: d.seatsTotal,
      status: d.status,
    }));

    return new Response(JSON.stringify({ ok: true, dinners }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api:availability]", err);
    return new Response(JSON.stringify({ ok: false, dinners: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

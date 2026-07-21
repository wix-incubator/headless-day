// Post-checkout seat accounting. Called from the thank-you page (reached only
// after a successful order): decrement each reserved dinner's seatsAvailable by
// the quantity purchased, mark it sold out at 0, and record the order so a page
// refresh never double-counts.
import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import { orders } from "@wix/ecom";
import { productsV3 } from "@wix/stores";

/** Seat count → display status, matching the events page + seed scripts. */
export function statusForSeats(seats: number): string {
  if (seats <= 0) return "Sold out";
  if (seats <= 4) return "Filling";
  return "Open";
}

/** reserve-<slug> and reserve-deposit-<slug> both hold one seat of dinner <slug>. */
const dinnerSlugFromProduct = (slug: string) => slug.replace(/^reserve-(deposit-)?/, "");

async function alreadyProcessed(orderId: string): Promise<boolean> {
  const q = auth.elevate(items.query);
  const { items: rows } = await q("ProcessedOrders").eq("orderId", orderId).limit(1).find();
  return rows.length > 0;
}

/** Map every reservation product id → its dinner slug. */
async function reservationProductMap(): Promise<Record<string, string>> {
  const { items: products } = await auth.elevate(productsV3.queryProducts)().limit(200).find();
  const map: Record<string, string> = {};
  for (const p of products as any[]) {
    if (typeof p.slug === "string" && p.slug.startsWith("reserve-")) {
      map[p._id] = dinnerSlugFromProduct(p.slug);
    }
  }
  return map;
}

/**
 * Apply a completed order to dinner seat counts. Idempotent per orderId.
 * Returns a small summary; never throws (the thank-you page must still render).
 */
export async function applyOrderToSeats(orderId: string): Promise<{ status: string; changed?: string[] }> {
  try {
    if (await alreadyProcessed(orderId)) return { status: "already-processed" };

    const order = await auth.elevate(orders.getOrder)(orderId);
    const lineItems = (order?.lineItems ?? []) as any[];

    const productMap = await reservationProductMap();

    // seats to remove per dinner slug
    const toRemove: Record<string, number> = {};
    for (const li of lineItems) {
      const catalogItemId = li?.catalogReference?.catalogItemId;
      const dinnerSlug = catalogItemId ? productMap[catalogItemId] : undefined;
      if (!dinnerSlug) continue;
      toRemove[dinnerSlug] = (toRemove[dinnerSlug] ?? 0) + Number(li.quantity ?? 1);
    }

    const changed: string[] = [];
    for (const [slug, qty] of Object.entries(toRemove)) {
      const q = auth.elevate(items.query);
      const { items: rows } = await q("Dinners").eq("slug", slug).limit(1).find();
      const dinner = rows[0];
      if (!dinner) continue;
      const next = Math.max(0, Number(dinner.seatsAvailable ?? 0) - qty);
      await auth.elevate(items.update)("Dinners", {
        ...dinner,
        seatsAvailable: next,
        status: statusForSeats(next),
      });
      changed.push(`${slug}:${next}`);
    }

    // Record so a refresh doesn't decrement again
    await auth.elevate(items.insert)("ProcessedOrders", { orderId });

    return { status: "processed", changed };
  } catch (err) {
    console.error("[orders] applyOrderToSeats failed:", err);
    return { status: "error" };
  }
}

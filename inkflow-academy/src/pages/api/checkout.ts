import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { STORES_APP_ID } from "../../lib/wix-constants";
import { json } from "../../lib/json";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ error: "No items in cart." }, 400);

    let origin = typeof body.origin === "string" ? body.origin : "";
    if (!origin.startsWith("https://")) {
      const host =
        request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
        new URL(request.url).host;
      const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      origin = `${local ? "http" : "https"}://${host}`;
    }

    const lineItems = items
      .map((it: { id?: string; qty?: number }) => {
        const id = typeof it.id === "string" ? it.id : "";
        if (!id) return null;
        const qty = Math.max(1, parseInt(String(it.qty), 10) || 1);
        return {
          quantity: qty,
          catalogReference: { appId: STORES_APP_ID, catalogItemId: id },
        };
      })
      .filter(Boolean);

    if (!lineItems.length) return json({ error: "Could not resolve cart items." }, 422);

    const created = await auth.elevate(checkout.createCheckout)({
      lineItems,
      channelType: checkout.ChannelType.WEB,
    } as Parameters<typeof checkout.createCheckout>[0]);

    const checkoutId = created._id;
    if (!checkoutId) return json({ error: "Could not create checkout." }, 500);

    const { redirectSession } = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: { postFlowUrl: origin },
    });

    const url = redirectSession?.fullUrl;
    if (!url) return json({ error: "Could not start checkout." }, 500);
    return json({ url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "checkout failed";
    return json({ error: message }, 500);
  }
};

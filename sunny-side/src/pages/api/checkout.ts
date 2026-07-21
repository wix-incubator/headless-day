import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { getPass, getPassVariantId, STORES_APP_ID } from "../../lib/wix";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let origin = "";
    try {
      const body = await request.json();
      origin = (body?.origin || "").toString();
    } catch {
      /* ignore */
    }
    if (!origin || !origin.startsWith("https://")) {
      origin = "https://" + new URL(request.url).host;
    }

    const pass = await getPass();
    if (!pass) return json({ error: "Product unavailable" }, 500);
    const variantId = await getPassVariantId(pass._id);

    // Create the checkout server-side with elevated permissions (deterministic —
    // no reliance on a per-visitor session cart across stateless calls).
    const created = await auth.elevate(checkout.createCheckout)({
      lineItems: [
        {
          quantity: 1,
          catalogReference: {
            appId: STORES_APP_ID,
            catalogItemId: pass._id,
            ...(variantId ? { options: { variantId } } : {}),
          },
        },
      ],
      channelType: "WEB" as any,
    });

    const checkoutId = created._id;
    if (!checkoutId) return json({ error: "Could not create checkout" }, 500);

    const session = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: {
        postFlowUrl: `${origin}/pass`,
        thankYouPageUrl: `${origin}/thank-you?purchased=1`,
      },
    });

    const url = session.redirectSession?.fullUrl;
    if (!url) return json({ error: "Could not start checkout" }, 500);
    return json({ url });
  } catch (e: any) {
    console.error("checkout route failed", e);
    return json({ error: e?.message || "Checkout failed" }, 500);
  }
};

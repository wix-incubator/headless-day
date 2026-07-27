import type { APIRoute } from "astro";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { origin = "" } = await request.json().catch(() => ({ origin: "" }));
    // MUST be the https published host (the redirect allowlist rejects http) — passed from the client.
    const base = String(origin).replace(/^http:/, "https:").replace(/\/$/, "");

    const checkout = await currentCart.createCheckoutFromCurrentCart({
      channelType: currentCart.ChannelType.WEB,
    });

    const session = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId: checkout.checkoutId },
      callbacks: {
        postFlowUrl: `${base}/`,
        thankYouPageUrl: `${base}/thank-you`,
      },
    });

    return json({ url: session.redirectSession?.fullUrl });
  } catch (e: any) {
    return json({ error: e?.message || "Could not start checkout." }, 500);
  }
};

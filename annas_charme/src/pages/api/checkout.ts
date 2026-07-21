import type { APIRoute } from "astro";
import { createCheckoutUrl } from "../../lib/wix";

export const GET: APIRoute = async ({ request }) => {
  try {
    const checkoutUrl = await createCheckoutUrl(new URL(request.url).origin);

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const appErr = e?.details?.applicationError;
    const msg = appErr?.description ?? appErr?.code ?? e?.message ?? String(e);
    console.error("Checkout error:", JSON.stringify({ code: appErr?.code, msg }));
    return new Response(JSON.stringify({ error: msg, code: appErr?.code }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }
};

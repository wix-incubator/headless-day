import type { APIRoute } from "astro";
import { getWixClient, STORES_APP_ID } from "../../lib/wix-client";
import { checkout } from "@wix/ecom";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { productIds } = await request.json();

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Response(JSON.stringify({ error: "No products selected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const wixClient = getWixClient(locals);

  const createdCheckout = await wixClient.checkout.createCheckout({
    lineItems: productIds.map((catalogItemId: string) => ({
      catalogReference: { appId: STORES_APP_ID, catalogItemId },
      quantity: 1,
    })),
    channelType: checkout.ChannelType.WEB,
  });

  const { checkoutUrl } = await wixClient.checkout.getCheckoutUrl(createdCheckout._id!);

  return new Response(JSON.stringify({ checkoutUrl }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

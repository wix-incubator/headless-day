import type { APIRoute } from 'astro';
import { checkout } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { auth } from '@wix/essentials';

export const prerender = false;

const DELIVERY_FEE = 18;

export const POST: APIRoute = async ({ request }) => {
  try {
    const b = await request.json();
    const { lines } = b as { lines: { id: string; bouquetName: string; cowName: string; unitPrice: number }[] };

    const customLineItems = lines.map((l) => ({
      _id: l.id,
      productName: { original: `${l.bouquetName} — for ${l.cowName}` },
      price: String(l.unitPrice),
      quantity: 1,
      itemType: { preset: 'DIGITAL' as const },
    }));

    // Delivery fee as its own line item
    customLineItems.push({
      _id: 'delivery-fee',
      productName: { original: 'Pasture delivery' },
      price: String(DELIVERY_FEE),
      quantity: 1,
      itemType: { preset: 'DIGITAL' as const },
    });

    const elevatedCreateCheckout = auth.elevate(checkout.createCheckout);
    const result = await elevatedCreateCheckout({
      customLineItems,
      channelType: 'WEB',
    }) as any;

    // SDK may return { checkout: { _id } } or the checkout object directly
    const checkoutId: string = result?.checkout?._id ?? result?._id;
    if (!checkoutId) throw new Error(`createCheckout returned no id: ${JSON.stringify(result)}`);

    const origin = new URL(request.url).origin;
    const { redirectSession } = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: {
        thankYouPageUrl: `${origin}/delivered`,
        cartPageUrl: `${origin}/cart`,
      },
    });

    return new Response(
      JSON.stringify({ checkoutUrl: redirectSession?.fullUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('checkout error:', e);
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

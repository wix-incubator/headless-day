import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';

export const prerender = false;

// Records a (mock) bouquet order into the admin-only Orders CMS collection.
export const POST: APIRoute = async ({ request }) => {
  try {
    const b = await request.json();
    const insert = auth.elevate(items.insert);
    await insert('Orders', {
      orderNumber: Number(b.orderNumber) || undefined,
      senderName: String(b.senderName || ''),
      senderEmail: String(b.senderEmail || ''),
      recipient: String(b.recipient || ''),
      bouquet: String(b.bouquet || ''),
      stems: String(b.stems || ''),
      addOns: String(b.addOns || ''),
      giftMessage: String(b.giftMessage || ''),
      deliveryPasture: String(b.deliveryPasture || ''),
      deliveryDate: String(b.deliveryDate || ''),
      total: Number(b.total) || 0,
      status: String(b.status || 'received'),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

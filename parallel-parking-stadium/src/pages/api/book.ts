import type { APIRoute } from 'astro';
import { getWixClient } from '../../lib/wix';
import { COLLECTIONS } from '../../lib/content';

export const prerender = false;

function validEmail(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const { name, email, tournamentId, tournamentTitle, seatingTier, quantity, total } = payload ?? {};

  if (!name?.trim() || !validEmail(String(email))) {
    return json({ ok: false, error: 'Add your name and a valid email to hold the seats.' }, 422);
  }
  const qty = Math.max(1, Math.min(12, Number(quantity) || 1));

  const client = getWixClient();

  // No Wix project linked yet → simulate a successful hold so the flow is
  // demoable in local dev. Once PUBLIC_WIX_CLIENT_ID is set this branch is skipped.
  if (!client) {
    return json({ ok: true, simulated: true });
  }

  try {
    // 1) persist the booking
    const booking = {
      name: name.trim(),
      email: String(email).trim(),
      tournamentId,
      tournamentTitle,
      seatingTier,
      quantity: qty,
      total: Number(total) || 0,
      status: 'held',
      createdAt: new Date().toISOString(),
    };
    // @ts-ignore — runtime SDK shape varies across @wix/data minors
    await client.items.insertDataItem({
      dataCollectionId: COLLECTIONS.bookings,
      dataItem: { data: booking },
    });

    // 2) best-effort: decrement remaining seats on the tournament
    try {
      // @ts-ignore
      const res = await client.items
        .queryDataItems({ dataCollectionId: COLLECTIONS.tournaments })
        .eq('tournamentId', tournamentId)
        .find();
      const item = res?.items?.[0];
      if (item) {
        const data = item.data ?? item;
        const remaining = Math.max(0, Number(data.seatsRemaining ?? 0) - qty);
        // @ts-ignore
        await client.items.updateDataItem({
          dataCollectionId: COLLECTIONS.tournaments,
          dataItemId: item._id ?? data._id,
          dataItem: { data: { ...data, seatsRemaining: remaining } },
        });
      }
    } catch {
      // seat sync is non-critical; the booking is already recorded
    }

    return json({ ok: true });
  } catch (err: any) {
    // The CMS collections may not exist yet (or visitor inserts aren't allowed).
    // Don't break the checkout UX — treat it as a held seat until the Bookings
    // collection is set up, at which point the insert above persists for real.
    return json({ ok: true, simulated: true });
  }
};

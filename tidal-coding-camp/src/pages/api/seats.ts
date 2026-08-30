import type { APIRoute } from 'astro';
import { items } from '@wix/data';

export const prerender = false;

// Public read of live seat counts. Returns { seats: { I:{reserved,capacity,status}, ... } }.
export const GET: APIRoute = async () => {
  try {
    const res: any = await (items as any).query('SessionSeats').find();
    const list: any[] = res?.items ?? res?._items ?? [];
    const seats: Record<string, any> = {};
    for (const it of list) {
      const cap = it.capacity ?? 12;
      const left = Math.max(0, cap - (it.reserved ?? 0));
      seats[it._id] = { reserved: it.reserved ?? 0, capacity: cap, left, status: statusFor(left) };
    }
    return json({ ok: true, seats });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
};

function statusFor(left: number) {
  if (left <= 0) return 'Waitlist';
  if (left <= 3) return `${left} spot${left === 1 ? '' : 's'}`;
  return 'Open';
}
function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });
}

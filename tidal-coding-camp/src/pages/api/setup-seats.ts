import type { APIRoute } from 'astro';
import { collections, items } from '@wix/data';
import { auth } from '@wix/essentials';

export const prerender = false;
const TOKEN = import.meta.env.SETUP_TOKEN ?? process.env.SETUP_TOKEN;

// Public seat-counter collection: read = ANYONE (no personal data), writes = elevated only.
const collection = {
  _id: 'SessionSeats',
  displayName: 'SessionSeats',
  fields: [
    { key: 'session', displayName: 'Session', type: 'TEXT' },
    { key: 'reserved', displayName: 'Reserved', type: 'NUMBER' },
    { key: 'capacity', displayName: 'Capacity', type: 'NUMBER' },
  ],
  permissions: { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ANYONE' },
};

// Seed reflects the current indicative badges: I/II open, III 3 left, IV full → waitlist.
const SEED = [
  { _id: 'I', session: 'Session I', reserved: 2, capacity: 12 },
  { _id: 'II', session: 'Session II', reserved: 5, capacity: 12 },
  { _id: 'III', session: 'Session III', reserved: 9, capacity: 12 },
  { _id: 'IV', session: 'Session IV', reserved: 12, capacity: 12 },
];

export const GET: APIRoute = async ({ url }) => {
  if (!TOKEN || url.searchParams.get('token') !== TOKEN) return json({ ok: false, error: 'forbidden' }, 403);
  const log: any = {};
  const create = auth.elevate(collections.createDataCollection);
  const list = auth.elevate(collections.listDataCollections);
  const bulk = auth.elevate(items.bulkInsert);
  try {
    const res: any = await list({});
    const existing = (res?.collections ?? res?.dataCollections ?? []).map((c: any) => c._id ?? c.id);
    if (!existing.includes('SessionSeats')) { await create(collection as any); log.collection = 'created'; }
    else log.collection = 'exists';
  } catch (e: any) { log.collection = 'ERR: ' + (e?.message || String(e)); }
  try {
    const save = auth.elevate(items.save);
    for (const s of SEED) await save('SessionSeats', s as any); // overwrite → resets to a clean spread
    log.seed = `saved ${SEED.length}`;
  } catch (e: any) { log.seed = 'ERR: ' + (e?.message || String(e)); }
  return json({ ok: true, log }, 200);
};
function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d, null, 2), { status, headers: { 'content-type': 'application/json' } });
}

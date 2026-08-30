import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';

export const prerender = false;

const FIELDS = [
  'camperFirstName', 'camperAge', 'parentName', 'parentEmail',
  'preferredSession', 'codingExperience', 'parentConsentAcknowledged', 'questionForUs',
] as const;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  // Server-side validation — never trust the client.
  const errors: string[] = [];
  const first = String(body.camperFirstName ?? '').trim();
  const age = Number(body.camperAge);
  const parentName = String(body.parentName ?? '').trim();
  const parentEmail = String(body.parentEmail ?? '').trim();
  const session = String(body.preferredSession ?? '').trim();
  const consent = body.parentConsentAcknowledged === true || body.parentConsentAcknowledged === 'on';
  if (!first) errors.push('camperFirstName');
  if (!Number.isFinite(age) || age < 13 || age > 17) errors.push('camperAge');
  if (!parentName) errors.push('parentName');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail)) errors.push('parentEmail');
  if (!session) errors.push('preferredSession');
  if (!consent) errors.push('parentConsentAcknowledged');
  if (errors.length) return json({ ok: false, error: 'validation', fields: errors }, 422);

  const key = (session.match(/Session (IV|III|II|I)\b/) || [])[1] || null;

  // Live seat check + increment (public read; elevated write).
  let waitlisted = false, left: number | null = null;
  if (key) {
    try {
      const res: any = await (items as any).query('SessionSeats').find();
      const seat = (res?.items ?? []).find((x: any) => x._id === key);
      const cap = seat?.capacity ?? 12;
      const reserved = seat?.reserved ?? 0;
      waitlisted = reserved >= cap;
      left = Math.max(0, cap - (reserved + 1));
      const save = auth.elevate(items.save);
      await save('SessionSeats', { _id: key, session: `Session ${key}`, reserved: reserved + 1, capacity: cap } as any);
    } catch (e) {
      console.error('[apply] seat update failed:', e instanceof Error ? e.message : e);
    }
  }

  const record: Record<string, unknown> = {};
  for (const f of FIELDS) record[f] = body[f] ?? null;
  record.camperAge = age;
  record.parentConsentAcknowledged = consent;
  record.submittedAt = new Date().toISOString();
  record.status = waitlisted ? 'waitlist' : 'reserved';

  try {
    await items.insert('Applications', record);
    return json({ ok: true, stored: true, waitlisted, left }, 200);
  } catch (err) {
    console.error('[apply] could not store reservation:', err instanceof Error ? err.message : err, record);
    return json({ ok: false, error: 'store_failed' }, 502);
  }
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

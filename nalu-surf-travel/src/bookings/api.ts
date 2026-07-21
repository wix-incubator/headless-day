import { createWixClient, type WixClient } from './client';
import { groupSlotsByDay, type DaySlots, type Slot } from './mapping';

export const SERVICE_NAME = 'Surf trip planning session';

// Wix Bookings' fixed appDefId — the ecom catalogReference.appId for a booking
// line item, same value on every Wix site (not this site's own OAuth CLIENT_ID).
const BOOKING_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';

export class AvailabilityError extends Error {}
export class SlotConflictError extends Error {}

let client: WixClient | undefined;
let cachedService: { id: string; name: string } | undefined;

function wix(): WixClient {
  return (client ??= createWixClient());
}

export async function getService(): Promise<{ id: string; name: string }> {
  if (cachedService) return cachedService;
  const res = await wix().services.queryServices().eq('name', SERVICE_NAME).find();
  const svc = res.items?.[0];
  if (!svc) throw new AvailabilityError(`Service "${SERVICE_NAME}" not found — create it in the dashboard`);
  cachedService = { id: svc._id as string, name: svc.name as string };
  return cachedService;
}

export async function getAvailability(
  serviceId: string, fromISO: string, toISO: string, timeZone: string,
): Promise<DaySlots[]> {
  try {
    const res = await wix().availabilityCalendar.queryAvailability(
      { filter: { serviceId: [serviceId], startDate: fromISO, endDate: toISO } },
      { timezone: timeZone },
    );
    return groupSlotsByDay(res.availabilityEntries ?? [], timeZone);
  } catch (e) {
    throw new AvailabilityError(String(e));
  }
}

function isConflict(e: unknown): boolean {
  const code = String((e as any)?.details?.applicationError?.code ?? '').toUpperCase();
  return (
    code.includes('SLOT') ||
    code === 'INSUFFICIENT_INVENTORY' ||
    code === 'LINE_ITEMS_OUT_OF_STOCK' ||
    code === '409'
  );
}

/**
 * `createBooking` alone leaves the booking `CREATED` — no calendar session,
 * no slot hold, invisible in the owner's dashboard. The ecom Cart V2 sequence
 * is what actually holds the seat (connector docs FLOW.md §3: `createBooking`
 * (→ CREATED) → `createCart` → `calculateCart` → `isCheckoutRequired ?`
 * hosted-checkout : `placeOrder`). Every service this app books is free, so
 * the calculated total is always 0 and this always reaches `placeOrder`
 * directly — a non-zero total would need the Wix-hosted checkout redirect,
 * which is out of scope for this fully in-game flow, so it's treated as a
 * (non-conflict) failure instead.
 */
async function completeCheckout(bookingId: string, contact: { name: string; email: string }): Promise<void> {
  const cart = await wix().cartV2.createCart({
    catalogItems: [{ quantity: 1, catalogReference: { catalogItemId: bookingId, appId: BOOKING_APP_ID } }],
    cart: { source: { channelType: 'WEB' }, customerInfo: { firstName: contact.name, email: contact.email } },
  });
  const cartId = cart._id;
  if (!cartId) throw new Error('createCart did not return a cart id');

  const { summary } = await wix().cartV2.calculateCart(cartId);
  const total = Number(summary?.priceSummary?.total?.amount ?? 0);
  if (total !== 0) {
    throw new Error(`Checkout requires payment (total ${total}) — hosted checkout is out of scope`);
  }

  const order = await wix().cartV2.placeOrder(cartId);
  if (!order?.orderId) throw new Error('placeOrder did not return an order id');
}

export async function createBooking(
  slot: Slot, contact: { name: string; email: string },
): Promise<{ bookingId: string }> {
  try {
    const res = await wix().bookings.createBooking({
      totalParticipants: 1,
      // Send the availability slot back verbatim — without a sessionId the API
      // requires scheduleId, resource.id, and location.locationType from it.
      bookedEntity: { slot: slot.raw },
      contactDetails: { firstName: contact.name, email: contact.email },
    });
    const bookingId = (res as any).booking?._id ?? (res as any)._id;
    await completeCheckout(bookingId, contact);
    return { bookingId };
  } catch (e) {
    if (isConflict(e)) throw new SlotConflictError(String(e));
    throw new AvailabilityError(String(e));
  }
}

/** Test-only: reset module caches. */
export function _resetForTests() { client = undefined; cachedService = undefined; }

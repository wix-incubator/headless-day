import { vi } from 'vitest';

const queryServices = vi.fn();
const queryAvailability = vi.fn();
const createBookingFn = vi.fn();
const createCart = vi.fn();
const calculateCart = vi.fn();
const placeOrder = vi.fn();

vi.mock('./client', () => ({
  createWixClient: () => ({
    services: { queryServices },
    availabilityCalendar: { queryAvailability },
    bookings: { createBooking: createBookingFn },
    cartV2: { createCart, calculateCart, placeOrder },
  }),
}));

import { getService, getAvailability, createBooking, SlotConflictError, AvailabilityError, SERVICE_NAME, _resetForTests } from './api';

// Wix Bookings' fixed appDefId — same constant api.ts uses as the ecom
// catalogReference.appId (not this site's own OAuth client id).
const BOOKING_APP_ID = '13d21c63-b5ec-5912-8397-c3a5ddb27a97';

function mockFreeCheckout(cartId = 'cart-1', orderId = 'order-1') {
  createCart.mockResolvedValue({ _id: cartId });
  calculateCart.mockResolvedValue({ cart: { _id: cartId }, summary: { priceSummary: { total: { amount: '0' } } } });
  placeOrder.mockResolvedValue({ orderId, completed: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetForTests();
});

test('getService finds the trip-planning service by name and caches it', async () => {
  queryServices.mockReturnValue({
    eq: () => ({ find: async () => ({ items: [{ _id: 'svc-1', name: SERVICE_NAME }] }) }),
  });
  const first = await getService();
  expect(first).toEqual({ id: 'svc-1', name: SERVICE_NAME });
  await getService();
  expect(queryServices).toHaveBeenCalledTimes(1);
});

test('getAvailability maps entries into day groups', async () => {
  queryAvailability.mockResolvedValue({
    availabilityEntries: [
      { bookable: true, slot: { startDate: '2026-07-14T09:00:00Z', endDate: '2026-07-14T09:30:00Z' } },
    ],
  });
  const days = await getAvailability('svc-1', '2026-07-14T00:00:00Z', '2026-08-14T00:00:00Z', 'UTC');
  expect(days).toEqual([{
    dateISO: '2026-07-14',
    slots: [{
      startISO: '2026-07-14T09:00:00Z',
      endISO: '2026-07-14T09:30:00Z',
      raw: { startDate: '2026-07-14T09:00:00Z', endDate: '2026-07-14T09:30:00Z' },
    }],
  }]);
});

test('getAvailability wraps failures in AvailabilityError', async () => {
  queryAvailability.mockRejectedValue(new Error('network'));
  await expect(getAvailability('svc-1', 'a', 'b', 'UTC')).rejects.toBeInstanceOf(AvailabilityError);
});

test('createBooking sends the full availability slot verbatim, drives it through ecom checkout, and returns the id', async () => {
  // The Bookings API rejects reconstructed slots: without sessionId it demands
  // startDate, endDate, location.locationType, resource.id, and scheduleId.
  const raw = {
    serviceId: 'svc-1',
    scheduleId: 'sched-1',
    startDate: '2026-07-14T09:00:00+03:00',
    endDate: '2026-07-14T09:30:00+03:00',
    resource: { _id: 'res-1', name: 'Business Owner' },
    location: { locationType: 'OWNER_BUSINESS' },
  };
  const slot = { startISO: raw.startDate, endISO: raw.endDate, raw };
  createBookingFn.mockResolvedValue({ booking: { _id: 'bk-9' } });
  mockFreeCheckout();

  await expect(createBooking(slot, { name: 'Kai', email: 'kai@x.com' }))
    .resolves.toEqual({ bookingId: 'bk-9' });

  expect(createBookingFn).toHaveBeenCalledWith(expect.objectContaining({
    bookedEntity: { slot: raw },
    contactDetails: { firstName: 'Kai', email: 'kai@x.com' },
  }));
  // createBooking alone leaves the booking CREATED — the ecom Cart V2
  // sequence is what actually holds the seat. Assert the full sequence fires
  // referencing the booking id, in order, ending in placeOrder (no
  // hosted-checkout redirect — this service is free).
  expect(createCart).toHaveBeenCalledWith({
    catalogItems: [{ quantity: 1, catalogReference: { catalogItemId: 'bk-9', appId: BOOKING_APP_ID } }],
    cart: { source: { channelType: 'WEB' }, customerInfo: { firstName: 'Kai', email: 'kai@x.com' } },
  });
  expect(calculateCart).toHaveBeenCalledWith('cart-1');
  expect(placeOrder).toHaveBeenCalledWith('cart-1');
});

test('createBooking maps a conflict at booking-creation time to SlotConflictError and never starts checkout', async () => {
  const slot = { startISO: 'a', endISO: 'b', raw: {} };
  createBookingFn.mockRejectedValue({ details: { applicationError: { code: 'SLOT_NOT_AVAILABLE' } } });
  await expect(createBooking(slot, { name: 'Kai', email: 'kai@x.com' }))
    .rejects.toBeInstanceOf(SlotConflictError);
  expect(createCart).not.toHaveBeenCalled();
});

test('createBooking maps a checkout-time slot conflict (cart rejects with INSUFFICIENT_INVENTORY) to SlotConflictError', async () => {
  const slot = { startISO: 'a', endISO: 'b', raw: {} };
  createBookingFn.mockResolvedValue({ booking: { _id: 'bk-9' } });
  createCart.mockRejectedValue({ details: { applicationError: { code: 'INSUFFICIENT_INVENTORY' } } });
  await expect(createBooking(slot, { name: 'Kai', email: 'kai@x.com' }))
    .rejects.toBeInstanceOf(SlotConflictError);
});

test('createBooking surfaces a generic checkout failure as AvailabilityError even though createBooking itself succeeded', async () => {
  const slot = { startISO: 'a', endISO: 'b', raw: {} };
  createBookingFn.mockResolvedValue({ booking: { _id: 'bk-9' } });
  mockFreeCheckout();
  placeOrder.mockRejectedValue(new Error('network blip'));
  await expect(createBooking(slot, { name: 'Kai', email: 'kai@x.com' }))
    .rejects.toBeInstanceOf(AvailabilityError);
});

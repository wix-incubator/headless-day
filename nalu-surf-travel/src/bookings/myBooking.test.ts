import { saveMyBooking, loadMyBooking } from './myBooking';

test('round-trips and survives garbage', () => {
  expect(loadMyBooking()).toBeNull();
  saveMyBooking({ bookingId: 'bk-1', startISO: '2026-07-14T09:00:00Z', destName: 'Bali — Uluwatu' });
  expect(loadMyBooking()?.bookingId).toBe('bk-1');
  localStorage.setItem('birdie-breaks.myBooking.v1', '{not json');
  expect(loadMyBooking()).toBeNull();
});

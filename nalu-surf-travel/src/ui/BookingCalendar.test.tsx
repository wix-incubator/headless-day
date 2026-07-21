import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const getService = vi.fn();
const getAvailability = vi.fn();
const createBooking = vi.fn();
vi.mock('../bookings/api', async (orig) => ({
  ...(await orig() as object),
  getService: (...a: unknown[]) => getService(...a),
  getAvailability: (...a: unknown[]) => getAvailability(...a),
  createBooking: (...a: unknown[]) => createBooking(...a),
}));

import { BookingCalendar } from './BookingCalendar';
import { SlotConflictError } from '../bookings/api';
import { useGame } from '../game/store';

const DAY = { dateISO: '2026-07-14', slots: [{ startISO: '2026-07-14T09:00:00Z', endISO: '2026-07-14T09:30:00Z', raw: { startDate: '2026-07-14T09:00:00Z', endDate: '2026-07-14T09:30:00Z', scheduleId: 'sched-1' } }] };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useGame.getState().reset();
  useGame.setState({ state: 'booking', activeDestId: 'bali', bookingReturnTo: 'landed' });
  getService.mockResolvedValue({ id: 'svc-1', name: 'x' });
});

test('happy path: pick day, slot, details, confirm → BOOKED + saved locally', async () => {
  const user = userEvent.setup();
  getAvailability.mockResolvedValue([DAY]);
  createBooking.mockResolvedValue({ bookingId: 'bk-1' });
  render(<BookingCalendar />);
  await user.click(await screen.findByRole('button', { name: '14' }));
  await user.click(screen.getByRole('button', { name: /09:00/ }));
  await user.type(screen.getByLabelText(/name/i), 'Kai');
  await user.type(screen.getByLabelText(/email/i), 'kai@surf.com');
  await user.click(screen.getByRole('button', { name: 'Confirm booking' }));
  await waitFor(() => expect(useGame.getState().state).toBe('confirmed'));
  expect(JSON.parse(localStorage.getItem('birdie-breaks.myBooking.v1')!).bookingId).toBe('bk-1');
});

test('load failure shows Nalu error with retry', async () => {
  getAvailability.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([DAY]);
  render(<BookingCalendar />);
  expect(await screen.findByText(/Choppy connection!/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByRole('button', { name: '14' })).toBeInTheDocument();
});

test('conflict re-queries and asks to pick another', async () => {
  const user = userEvent.setup();
  getAvailability.mockResolvedValue([DAY]);
  createBooking.mockRejectedValue(new SlotConflictError('taken'));
  render(<BookingCalendar />);
  await user.click(await screen.findByRole('button', { name: '14' }));
  await user.click(screen.getByRole('button', { name: /09:00/ }));
  await user.type(screen.getByLabelText(/name/i), 'Kai');
  await user.type(screen.getByLabelText(/email/i), 'kai@surf.com');
  await user.click(screen.getByRole('button', { name: 'Confirm booking' }));
  expect(await screen.findByText(/Someone just caught that one/)).toBeInTheDocument();
  expect(getAvailability).toHaveBeenCalledTimes(2);
});

test('zero availability points at the agent', async () => {
  getAvailability.mockResolvedValue([]);
  render(<BookingCalendar />);
  expect(await screen.findByText(/No open waves/)).toBeInTheDocument();
});

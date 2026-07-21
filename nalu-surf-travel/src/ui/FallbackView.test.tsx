import { render, screen } from '@testing-library/react';
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

import { FallbackView } from './FallbackView';
import { useGame } from '../game/store';
import { DESTINATIONS } from '../data/destinations';

const DAY = { dateISO: '2026-07-14', slots: [{ startISO: '2026-07-14T09:00:00Z', endISO: '2026-07-14T09:30:00Z', raw: { startDate: '2026-07-14T09:00:00Z', endDate: '2026-07-14T09:30:00Z', scheduleId: 'sched-1' } }] };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useGame.getState().reset();
  getService.mockResolvedValue({ id: 'svc-1', name: 'x' });
});

test('happy path booking lands on the confirmation card, not a stuck calendar', async () => {
  const user = userEvent.setup();
  getAvailability.mockResolvedValue([DAY]);
  createBooking.mockResolvedValue({ bookingId: 'bk-1' });
  render(<FallbackView />);

  await user.click(await screen.findByRole('button', { name: '14' }));
  await user.click(screen.getByRole('button', { name: /09:00/ }));
  await user.type(screen.getByLabelText(/name/i), 'Kai');
  await user.type(screen.getByLabelText(/email/i), 'kai@surf.com');
  await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

  expect(await screen.findByText("You're booked!")).toBeInTheDocument();
  expect(useGame.getState().state).toBe('confirmed');
  expect(screen.queryByRole('dialog', { name: /Book with your surf agent/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Checking the agent's calendar/i)).not.toBeInTheDocument();
});

test('lists every destination even before the calendar loads', () => {
  getAvailability.mockResolvedValue([]);
  render(<FallbackView />);
  for (const d of DESTINATIONS) {
    expect(screen.getByRole('heading', { name: new RegExp(d.emoji) })).toBeInTheDocument();
    expect(screen.getByText(d.blurb)).toBeInTheDocument();
  }
});

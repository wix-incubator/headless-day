import { groupSlotsByDay, formatTime } from './mapping';

const entry = (startISO: string, bookable = true) => ({
  bookable,
  slot: {
    startDate: startISO,
    endDate: new Date(new Date(startISO).getTime() + 30 * 60000).toISOString(),
    scheduleId: `sched-${startISO}`,
    resource: { _id: 'res-1' },
    location: { locationType: 'OWNER_BUSINESS' },
  },
});

test('groups bookable slots by local day, ordered', () => {
  const days = groupSlotsByDay([
    entry('2026-07-14T09:00:00Z'),
    entry('2026-07-14T15:00:00Z'),
    entry('2026-07-15T10:00:00Z'),
    entry('2026-07-14T11:00:00Z', false), // not bookable → dropped
  ], 'UTC');
  expect(days.map((d) => d.dateISO)).toEqual(['2026-07-14', '2026-07-15']);
  expect(days[0].slots).toHaveLength(2);
});

test('keeps the full availability slot verbatim (same reference) for booking', () => {
  const e = entry('2026-07-14T09:00:00Z');
  const days = groupSlotsByDay([e], 'UTC');
  // identity, not just shape: createBooking must send back exactly what the API returned
  expect(days[0].slots[0].raw).toBe(e.slot);
});

test('formatTime renders in the given time zone', () => {
  expect(formatTime('2026-07-14T09:00:00Z', 'UTC')).toBe('09:00');
});

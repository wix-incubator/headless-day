/** The SDK's availability slot, kept verbatim (same object reference) — createBooking
 *  must send it back unmodified: the API requires its scheduleId, resource.id, and
 *  location.locationType. Typed to the two fields we read; the rest rides along. */
export interface RawSlot { startDate?: string | null; endDate?: string | null }

export interface Slot { startISO: string; endISO: string; raw: RawSlot }
export interface DaySlots { dateISO: string; slots: Slot[] }

interface AvailabilityEntry { bookable?: boolean | null; slot?: RawSlot }

export function groupSlotsByDay(entries: AvailabilityEntry[], timeZone: string): DaySlots[] {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const byDay = new Map<string, Slot[]>();
  for (const e of entries) {
    if (!e.bookable || !e.slot?.startDate || !e.slot.endDate) continue;
    const dateISO = fmt.format(new Date(e.slot.startDate));
    const list = byDay.get(dateISO) ?? [];
    list.push({ startISO: e.slot.startDate, endISO: e.slot.endDate, raw: e.slot });
    byDay.set(dateISO, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, slots]) => ({
      dateISO,
      slots: slots.sort((a, b) => a.startISO.localeCompare(b.startISO)),
    }));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

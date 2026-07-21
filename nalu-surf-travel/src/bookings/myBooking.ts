export interface MyBooking { bookingId: string; startISO: string; destName?: string }
const KEY = 'birdie-breaks.myBooking.v1';

export function saveMyBooking(b: MyBooking): void {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode: booking still exists in dashboard */ }
}

export function loadMyBooking(): MyBooking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    return typeof b?.bookingId === 'string' && typeof b?.startISO === 'string' ? b : null;
  } catch { return null; }
}

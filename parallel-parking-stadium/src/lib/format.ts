import type { Tournament } from '../data/seed';

/** Status → the arcade badge / accent color set used on tournament cards. */
export function statusColors(status: Tournament['status']) {
  if (status === 'Sold out') {
    return { bg: 'var(--panel-2)', fg: 'var(--ink-dim)', accent: 'var(--grid)', seat: 'var(--ink-dim)' };
  }
  if (status === 'Almost sold out') {
    // white text on magenta (dark ink fails AA); gold is the legible seat count on light
    return { bg: 'var(--magenta)', fg: '#fff', accent: 'var(--magenta)', seat: 'var(--magenta)' };
  }
  // yellow is a fill only — text on it is near-black ink, seat count uses legible gold
  return { bg: 'var(--yellow)', fg: 'var(--ink)', accent: 'var(--yellow)', seat: 'var(--gold)' };
}

/** Tournaments that can still be booked. */
export function onSale(tournaments: Tournament[]) {
  return tournaments.filter((t) => t.status !== 'Sold out');
}

/** Width of the rankings margin bar — smaller margin reads as a longer bar. */
export function marginBarWidth(margin: number, maxMargin = 15) {
  return Math.round((1 - ((margin - 5) / (maxMargin - 5)) * 0.8) * 100) + '%';
}

// ---------------------------------------------------------------------------
// Headless data layer.
//
// This module is the ONLY place the presentation layer gets event data from,
// and it is shaped like a typical headless CMS / commerce API response.
// fetchEvent() overlays the live Wix Event (title, kickoff, venue, ticket
// prices + the ticketDefinitionId used at checkout) on top of the simulated
// defaults below; when Wix isn't configured or is unavailable it returns the
// defaults as-is, so the app always runs. See src/wix.js.
// ---------------------------------------------------------------------------

import { fetchWixEvent } from './wix.js';

const EVENT = {
  id: 'evt_wc26_final_arg_esp',
  competition: 'World Cup 2026 · Final',
  // uiColor: darker variant readable on the light glass UI.
  home: { name: 'Argentina', short: 'ARG', color: '#74acdf', uiColor: '#1f77b4' },
  away: { name: 'Spain', short: 'ESP', color: '#e63946', uiColor: '#c8102e' },
  kickoff: 'Sun · 18:00 ET',
  // Concrete start/end so "Add to calendar" can build real invites.
  // Kept in sync with the Wix Campus watch-party event (Sun Aug 2, 18:00 ET).
  startsAt: '2026-08-02T18:00:00-04:00',
  endsAt: '2026-08-02T21:00:00-04:00',
  venue: 'Wix Headless Stadium · New York',
  score: { home: 0, away: 1, clockStart: 87 * 60 + 41 },
  // Seed drives seat availability + price jitter, deterministic per event.
  seed: 20260719,
  currency: '$',
  priceTiers: [
    { id: 'club',  name: 'Halfway Club',  price: 480, color: '#f5a524', blurb: 'Halfway-line view, padded seats, lounge access' },
    { id: 'lower', name: 'Lower Bowl',    price: 290, color: '#17b8a6', blurb: 'Close to the pitch, steep and loud' },
    { id: 'end',   name: 'Goal End',      price: 185, color: '#38bdf8', blurb: 'Behind the goals, where the tifos live' },
    { id: 'upper', name: 'Upper Bowl',    price: 120, color: '#8b93b8', blurb: 'Full tactical view of the whole pitch' },
  ],
};

export async function fetchEvent() {
  const base = structuredClone(EVENT);
  const live = await fetchWixEvent(); // null when Wix isn't configured
  return live ? mergeLive(base, live) : base;
}

// Overlays the live Wix Event onto the local defaults. Art direction that Wix
// Events doesn't model — team names/colors, live score, seed, tier ids/colors —
// stays local; title, kickoff, venue and per-tier price/blurb come from Wix,
// and each matched tier gains the `ticketDefinitionId` buySeat() needs.
function mergeLive(base, live) {
  if (live.competition) base.competition = live.competition;
  if (live.kickoff) base.kickoff = live.kickoff;
  if (live.startsAt) base.startsAt = live.startsAt;
  if (live.endsAt) base.endsAt = live.endsAt;
  if (live.venue) base.venue = live.venue;
  base.eventId = live.eventId;
  base.slug = live.slug;

  for (const tier of base.priceTiers) {
    // Match a live ticket definition to this tier by name, case-insensitively.
    const def = live.tiers.find(
      (t) => t.name && t.name.toLowerCase().includes(tier.name.toLowerCase()),
    );
    if (!def) continue;
    tier.ticketDefinitionId = def.ticketDefinitionId;
    if (Number.isFinite(def.price)) tier.price = def.price;
    if (def.blurb) tier.blurb = def.blurb;
  }
  return base;
}

export function tierById(event, id) {
  return event.priceTiers.find((t) => t.id === id);
}

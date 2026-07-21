import { create } from 'zustand';
import { transition, type GameEvent, type GameStateName } from './machine';
import { stepFlight, nearestDestination, type FlightState, type FlightInput } from './flight';
import { DESTINATIONS, LANDING_RANGE_DEG, destinationById } from '../data/destinations';
import { VIGNETTES } from '../data/vignettes';

interface GameStore {
  state: GameStateName;
  flight: FlightState;
  activeDestId: string | null;
  bookingReturnTo: 'flying' | 'landed';
  // The destination we just took off from. LAND parks the heli on the dest's
  // touchdown coords, so on TAKE_OFF we're still inside its landing range —
  // without this guard tick would instantly re-fire ENTER_RANGE, bouncing us
  // back to 'approaching' and flashing the just-dismissed info card. Cleared in
  // tick once we've actually flown clear of that dest's range.
  suppressDestId: string | null;
  send: (ev: GameEvent) => void;
  tick: (input: FlightInput, dtSec: number) => void;
  flyTo: (destId: string) => void;
  reset: () => void;
}

const INITIAL = {
  state: 'intro' as GameStateName,
  // mid-Pacific start: Oahu is a short first flight away
  flight: { lat: 8, lng: -140, headingDeg: 0 } as FlightState,
  activeDestId: null as string | null,
  bookingReturnTo: 'flying' as const,
  suppressDestId: null as string | null,
};

export const useGame = create<GameStore>((set, get) => ({
  ...INITIAL,

  send: (ev) => {
    const from = get().state;
    const to = transition(from, ev);
    if (to === from && ev.type !== 'ENTER_RANGE') return set({});
    const patch: Partial<GameStore> = { state: to };
    if (ev.type === 'ENTER_RANGE') patch.activeDestId = ev.destId;
    if (ev.type === 'EXIT_RANGE') patch.activeDestId = null;
    if (ev.type === 'OPEN_BOOKING') patch.bookingReturnTo = from === 'landed' ? 'landed' : 'flying';
    if (ev.type === 'DONE') patch.activeDestId = null;
    // Taking off leaves the heli parked inside the dest's range; remember it so
    // tick won't immediately re-approach the spot we just left (activeDestId is
    // kept so the info card still has content for its slide-out).
    if (ev.type === 'TAKE_OFF') patch.suppressDestId = get().activeDestId;
    // The rig's existing lerp glides the globe toward whatever `flight` target is set,
    // so parking it on the destination's touchdown coords (not the pin's own lat/lng)
    // is what puts the postcard framing — landmark + wave in shot — in sync with the
    // bird's own landing descent (art-direction §4a).
    if (ev.type === 'LAND' && from === 'approaching') {
      const destId = get().activeDestId;
      const touchdown = destId ? VIGNETTES[destId]?.touchdown : undefined;
      if (touchdown) patch.flight = { ...get().flight, lat: touchdown.lat, lng: touchdown.lng };
    }
    set(patch);
  },

  tick: (input, dtSec) => {
    const { state, flight, send, suppressDestId } = get();
    if (state !== 'flying' && state !== 'approaching') return;
    const next = stepFlight(flight, input, dtSec);
    set({ flight: next });
    const near = nearestDestination(next, DESTINATIONS, LANDING_RANGE_DEG);
    // Release the just-left-destination guard once we're clear of its range (or
    // the nearest is a different spot) — then that spot can be approached again.
    let suppress = suppressDestId;
    if (suppress && (!near || near.dest.id !== suppress)) { suppress = null; set({ suppressDestId: null }); }
    if (near && state === 'flying' && near.dest.id !== suppress) send({ type: 'ENTER_RANGE', destId: near.dest.id });
    else if (near && state === 'approaching' && near.dest.id !== get().activeDestId) {
      set({ activeDestId: near.dest.id });
    } else if (!near && state === 'approaching') send({ type: 'EXIT_RANGE' });
  },

  flyTo: (destId) => {
    const dest = destinationById(destId);
    if (!dest) return;
    const state = get().state;
    if (state === 'intro') get().send({ type: 'INTRO_DONE' });
    set({
      state: 'approaching',
      activeDestId: dest.id,
      flight: { lat: dest.lat, lng: dest.lng, headingDeg: 90 },
      suppressDestId: null,
    });
  },

  reset: () => set({ ...INITIAL }),
}));

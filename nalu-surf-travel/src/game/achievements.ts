import { create } from 'zustand';
import { ACHIEVEMENTS, type AchievementState } from '../data/achievements';

const KEY = 'nalu.achievements.v2'; // v2: pole tracking split into north/south

/** The subset of AchievementsStore that actually survives a reload. `idleMs` and
 * `toastQueue` are session-only (idle resets on load; a queued toast that never
 * showed shouldn't come back from the dead). */
interface PersistedShape {
  unlocked: string[];
  coins: string[];
  visitedSpots: string[];
  lngTravelledDeg: number;
  northPoleReached: boolean;
  southPoleReached: boolean;
  booked: boolean;
}

const EMPTY_PERSISTED = (): PersistedShape => ({
  unlocked: [], coins: [], visitedSpots: [], lngTravelledDeg: 0,
  northPoleReached: false, southPoleReached: false, booked: false,
});

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Safe-parse + shape-validate, mirroring `src/bookings/myBooking.ts` — corrupt or
 * missing data never throws, it just falls back to an empty (fully-locked) state. */
export function loadAchievements(): PersistedShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PERSISTED();
    const p = JSON.parse(raw);
    if (
      isStringArray(p?.unlocked) && isStringArray(p?.coins) && isStringArray(p?.visitedSpots) &&
      typeof p?.lngTravelledDeg === 'number' && typeof p?.northPoleReached === 'boolean' &&
      typeof p?.southPoleReached === 'boolean' && typeof p?.booked === 'boolean'
    ) {
      return {
        unlocked: p.unlocked, coins: p.coins, visitedSpots: p.visitedSpots,
        lngTravelledDeg: p.lngTravelledDeg, northPoleReached: p.northPoleReached,
        southPoleReached: p.southPoleReached, booked: p.booked,
      };
    }
    return EMPTY_PERSISTED();
  } catch { return EMPTY_PERSISTED(); }
}

export function saveAchievements(s: PersistedShape): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: badges just won't survive a reload */ }
}

interface AchievementsStore extends PersistedShape {
  idleMs: number;
  toastQueue: string[];
  recordLanding: (destId: string) => void;
  collectCoin: (coinId: string) => boolean;
  recordFlight: (input: { dLngAbs: number; pole: 'north' | 'south' | null }) => void;
  recordIdle: (dtMs: number, moving: boolean) => void;
  recordBooked: () => void;
  dismissToast: () => void;
  reset: () => void;
}

export const useAchievements = create<AchievementsStore>((set, get) => {
  function persist() {
    const { unlocked, coins, visitedSpots, lngTravelledDeg, northPoleReached, southPoleReached, booked } = get();
    saveAchievements({ unlocked, coins, visitedSpots, lngTravelledDeg, northPoleReached, southPoleReached, booked });
  }

  // Runs every not-yet-unlocked rule against the current (persisted-shape + idleMs)
  // state; anything newly true gets appended to both `unlocked` (so it never re-fires)
  // and `toastQueue` (so the UI announces it exactly once). Always persists afterward —
  // `evaluate()` is the one place that writes to storage, so every recorder that mutates
  // persisted state just has to call it, rather than each managing its own save.
  function evaluate() {
    const state = get();
    const asAchievementState: AchievementState = {
      unlocked: state.unlocked,
      coins: state.coins,
      visitedSpots: state.visitedSpots,
      lngTravelledDeg: state.lngTravelledDeg,
      northPoleReached: state.northPoleReached,
      southPoleReached: state.southPoleReached,
      booked: state.booked,
      idleMs: state.idleMs,
    };
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (a) => !state.unlocked.includes(a.id) && a.isUnlocked(asAchievementState),
    );
    if (newlyUnlocked.length > 0) {
      set({
        unlocked: [...state.unlocked, ...newlyUnlocked.map((a) => a.id)],
        toastQueue: [...state.toastQueue, ...newlyUnlocked.map((a) => a.id)],
      });
    }
    persist();
  }

  return {
    ...loadAchievements(),
    idleMs: 0,
    toastQueue: [],

    recordLanding: (destId) => {
      const { visitedSpots } = get();
      if (!visitedSpots.includes(destId)) set({ visitedSpots: [...visitedSpots, destId] });
      evaluate();
    },

    collectCoin: (coinId) => {
      if (get().coins.includes(coinId)) return false;
      set({ coins: [...get().coins, coinId] });
      evaluate();
      return true;
    },

    recordFlight: ({ dLngAbs, pole }) => {
      const { lngTravelledDeg, northPoleReached, southPoleReached } = get();
      set({
        lngTravelledDeg: lngTravelledDeg + Math.abs(dLngAbs),
        northPoleReached: northPoleReached || pole === 'north',
        southPoleReached: southPoleReached || pole === 'south',
      });
      evaluate();
    },

    recordIdle: (dtMs, moving) => {
      set({ idleMs: moving ? 0 : get().idleMs + dtMs });
      evaluate();
    },

    recordBooked: () => {
      if (!get().booked) set({ booked: true });
      evaluate();
    },

    dismissToast: () => set({ toastQueue: get().toastQueue.slice(1) }),

    reset: () => {
      set({ ...EMPTY_PERSISTED(), idleMs: 0, toastQueue: [] });
      persist();
    },
  };
});

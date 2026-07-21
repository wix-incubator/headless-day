import { useAchievements, loadAchievements, saveAchievements } from './achievements';
import { DESTINATIONS } from '../data/destinations';
import { COINS } from '../data/coins';

const KEY = 'nalu.achievements.v2';

beforeEach(() => {
  localStorage.clear();
  useAchievements.getState().reset();
});

test('recordLanding unlocks first-landing and queues exactly one toast', () => {
  useAchievements.getState().recordLanding('oahu');
  expect(useAchievements.getState().unlocked).toContain('first-landing');
  expect(useAchievements.getState().toastQueue).toEqual(['first-landing']);
});

test('re-landing the same spot never re-queues the toast (dedup)', () => {
  useAchievements.getState().recordLanding('oahu');
  useAchievements.getState().dismissToast();
  useAchievements.getState().recordLanding('oahu');
  expect(useAchievements.getState().toastQueue).toEqual([]);
  expect(useAchievements.getState().visitedSpots).toEqual(['oahu']);
});

test('landing every destination unlocks globetrotter', () => {
  for (const d of DESTINATIONS) useAchievements.getState().recordLanding(d.id);
  expect(useAchievements.getState().unlocked).toContain('globetrotter');
});

test('collectCoin is idempotent: returns true once, false after, no duplicate toast', () => {
  const first = useAchievements.getState().collectCoin('arctic');
  const second = useAchievements.getState().collectCoin('arctic');
  expect(first).toBe(true);
  expect(second).toBe(false);
  expect(useAchievements.getState().coins).toEqual(['arctic']);
  expect(useAchievements.getState().toastQueue).toEqual(['first-coin']);
});

test('collecting all 8 coins unlocks treasure-hunter', () => {
  for (const c of COINS) useAchievements.getState().collectCoin(c.id);
  expect(useAchievements.getState().unlocked).toContain('treasure-hunter');
});

test('recordFlight accumulates longitude and unlocks around-the-world at 360deg', () => {
  useAchievements.getState().recordFlight({ dLngAbs: 200, pole: null });
  expect(useAchievements.getState().unlocked).not.toContain('around-the-world');
  useAchievements.getState().recordFlight({ dLngAbs: 160, pole: null });
  expect(useAchievements.getState().lngTravelledDeg).toBeCloseTo(360);
  expect(useAchievements.getState().unlocked).toContain('around-the-world');
});

test('north pole unlocks top-of-the-world only; south pole unlocks bottom-of-the-world only', () => {
  useAchievements.getState().recordFlight({ dLngAbs: 0, pole: 'north' });
  expect(useAchievements.getState().unlocked).toContain('top-of-the-world');
  expect(useAchievements.getState().unlocked).not.toContain('bottom-of-the-world');
  expect(useAchievements.getState().northPoleReached).toBe(true);

  useAchievements.getState().recordFlight({ dLngAbs: 0, pole: 'south' });
  expect(useAchievements.getState().unlocked).toContain('bottom-of-the-world');
  expect(useAchievements.getState().southPoleReached).toBe(true);
  // north stays sticky through a non-pole tick
  useAchievements.getState().recordFlight({ dLngAbs: 0, pole: null });
  expect(useAchievements.getState().northPoleReached).toBe(true);
});

test('recordBooked unlocks booked-it', () => {
  useAchievements.getState().recordBooked();
  expect(useAchievements.getState().unlocked).toContain('booked-it');
});

test('recordIdle unlocks just-chillin at 30s, moving resets the clock', () => {
  useAchievements.getState().recordIdle(29_000, false);
  expect(useAchievements.getState().unlocked).not.toContain('just-chillin');
  useAchievements.getState().recordIdle(500, true); // moving resets idleMs
  expect(useAchievements.getState().idleMs).toBe(0);
  useAchievements.getState().recordIdle(30_000, false);
  expect(useAchievements.getState().unlocked).toContain('just-chillin');
});

test('dismissToast shifts the queue in unlock order', () => {
  useAchievements.getState().recordLanding('oahu');
  useAchievements.getState().collectCoin('arctic');
  expect(useAchievements.getState().toastQueue).toEqual(['first-landing', 'first-coin']);
  useAchievements.getState().dismissToast();
  expect(useAchievements.getState().toastQueue).toEqual(['first-coin']);
  useAchievements.getState().dismissToast();
  expect(useAchievements.getState().toastQueue).toEqual([]);
});

test('mutations persist to localStorage under the versioned key', () => {
  useAchievements.getState().recordLanding('bali');
  const raw = localStorage.getItem(KEY);
  expect(raw).not.toBeNull();
  expect(JSON.parse(raw as string).visitedSpots).toEqual(['bali']);
});

test('loadAchievements round-trips a valid save', () => {
  saveAchievements({
    unlocked: ['first-landing'], coins: ['arctic'], visitedSpots: ['oahu'],
    lngTravelledDeg: 42, northPoleReached: true, southPoleReached: false, booked: false,
  });
  expect(loadAchievements()).toEqual({
    unlocked: ['first-landing'], coins: ['arctic'], visitedSpots: ['oahu'],
    lngTravelledDeg: 42, northPoleReached: true, southPoleReached: false, booked: false,
  });
});

test('loadAchievements safe-parses garbage and missing data back to empty', () => {
  expect(loadAchievements()).toEqual({
    unlocked: [], coins: [], visitedSpots: [], lngTravelledDeg: 0, northPoleReached: false, southPoleReached: false, booked: false,
  });
  localStorage.setItem(KEY, '{not json');
  expect(loadAchievements()).toEqual({
    unlocked: [], coins: [], visitedSpots: [], lngTravelledDeg: 0, northPoleReached: false, southPoleReached: false, booked: false,
  });
  localStorage.setItem(KEY, JSON.stringify({ unlocked: 'nope' }));
  expect(loadAchievements()).toEqual({
    unlocked: [], coins: [], visitedSpots: [], lngTravelledDeg: 0, northPoleReached: false, southPoleReached: false, booked: false,
  });
});

test('reset clears persisted state and the storage entry', () => {
  useAchievements.getState().recordLanding('oahu');
  useAchievements.getState().reset();
  expect(useAchievements.getState().unlocked).toEqual([]);
  expect(useAchievements.getState().toastQueue).toEqual([]);
  expect(JSON.parse(localStorage.getItem(KEY) as string).visitedSpots).toEqual([]);
});

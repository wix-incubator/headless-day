import { ACHIEVEMENTS, achievementById, type AchievementState } from './achievements';
import { DESTINATIONS } from './destinations';
import { COINS } from './coins';

const EMPTY: AchievementState = {
  unlocked: [],
  coins: [],
  visitedSpots: [],
  lngTravelledDeg: 0,
  northPoleReached: false,
  southPoleReached: false,
  booked: false,
  idleMs: 0,
};

function rule(id: string) {
  const a = achievementById(id);
  if (!a) throw new Error(`missing achievement ${id}`);
  return a.isUnlocked;
}

test('has exactly 9 achievements with unique ids', () => {
  expect(ACHIEVEMENTS).toHaveLength(9);
  expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(9);
});

test('first-landing: true once any spot is visited', () => {
  const isUnlocked = rule('first-landing');
  expect(isUnlocked(EMPTY)).toBe(false);
  expect(isUnlocked({ ...EMPTY, visitedSpots: ['oahu'] })).toBe(true);
});

test('globetrotter: true only once every destination is visited', () => {
  const isUnlocked = rule('globetrotter');
  expect(isUnlocked({ ...EMPTY, visitedSpots: ['oahu', 'bali'] })).toBe(false);
  expect(isUnlocked({ ...EMPTY, visitedSpots: DESTINATIONS.map((d) => d.id) })).toBe(true);
});

test('around-the-world: true once 360deg of longitude accumulate', () => {
  const isUnlocked = rule('around-the-world');
  expect(isUnlocked({ ...EMPTY, lngTravelledDeg: 359.9 })).toBe(false);
  expect(isUnlocked({ ...EMPTY, lngTravelledDeg: 360 })).toBe(true);
});

test('first-coin: true once any coin is collected', () => {
  const isUnlocked = rule('first-coin');
  expect(isUnlocked(EMPTY)).toBe(false);
  expect(isUnlocked({ ...EMPTY, coins: ['arctic'] })).toBe(true);
});

test('treasure-hunter: true only once all 8 coins are collected', () => {
  const isUnlocked = rule('treasure-hunter');
  expect(isUnlocked({ ...EMPTY, coins: COINS.slice(0, 7).map((c) => c.id) })).toBe(false);
  expect(isUnlocked({ ...EMPTY, coins: COINS.map((c) => c.id) })).toBe(true);
});

test('top-of-the-world: true only once the NORTH pole is reached', () => {
  const isUnlocked = rule('top-of-the-world');
  expect(isUnlocked(EMPTY)).toBe(false);
  expect(isUnlocked({ ...EMPTY, southPoleReached: true })).toBe(false); // south doesn't count
  expect(isUnlocked({ ...EMPTY, northPoleReached: true })).toBe(true);
});

test('bottom-of-the-world: true only once the SOUTH pole is reached', () => {
  const isUnlocked = rule('bottom-of-the-world');
  expect(isUnlocked(EMPTY)).toBe(false);
  expect(isUnlocked({ ...EMPTY, northPoleReached: true })).toBe(false); // north doesn't count
  expect(isUnlocked({ ...EMPTY, southPoleReached: true })).toBe(true);
});

test('booked-it: true once a trip is booked', () => {
  const isUnlocked = rule('booked-it');
  expect(isUnlocked(EMPTY)).toBe(false);
  expect(isUnlocked({ ...EMPTY, booked: true })).toBe(true);
});

test("just-chillin: true once idle for >=30s", () => {
  const isUnlocked = rule('just-chillin');
  expect(isUnlocked({ ...EMPTY, idleMs: 29_999 })).toBe(false);
  expect(isUnlocked({ ...EMPTY, idleMs: 30_000 })).toBe(true);
});

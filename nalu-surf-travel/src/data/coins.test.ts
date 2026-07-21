import { COINS, COIN_COLLECT_RANGE_DEG } from './coins';
import { DESTINATIONS, LANDING_RANGE_DEG } from './destinations';
import { angularDistanceDeg } from '../game/flight';

test('has exactly 8 coins with unique ids', () => {
  expect(COINS).toHaveLength(8);
  expect(new Set(COINS.map((c) => c.id)).size).toBe(8);
});

test('coordinates are valid lat/lng', () => {
  for (const c of COINS) {
    expect(c.lat).toBeGreaterThanOrEqual(-90);
    expect(c.lat).toBeLessThanOrEqual(90);
    expect(c.lng).toBeGreaterThanOrEqual(-180);
    expect(c.lng).toBeLessThanOrEqual(180);
  }
});

test('collect range is tighter than landing range', () => {
  expect(COIN_COLLECT_RANGE_DEG).toBeLessThan(LANDING_RANGE_DEG);
});

test('every coin is more than landing range away from every destination', () => {
  for (const c of COINS) {
    for (const d of DESTINATIONS) {
      const dist = angularDistanceDeg(c.lat, c.lng, d.lat, d.lng);
      expect(dist).toBeGreaterThan(LANDING_RANGE_DEG);
    }
  }
});

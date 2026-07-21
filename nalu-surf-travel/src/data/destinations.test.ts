import { DESTINATIONS, LANDING_RANGE_DEG } from './destinations';

test('has exactly twelve destinations with unique ids', () => {
  expect(DESTINATIONS).toHaveLength(12);
  expect(new Set(DESTINATIONS.map(d => d.id)).size).toBe(12);
});

test('coordinates are valid and spots are 2-3 per destination', () => {
  for (const d of DESTINATIONS) {
    expect(d.lat).toBeGreaterThanOrEqual(-90);
    expect(d.lat).toBeLessThanOrEqual(90);
    expect(d.lng).toBeGreaterThan(-180);
    expect(d.lng).toBeLessThanOrEqual(180);
    expect(d.spots.length).toBeGreaterThanOrEqual(2);
    expect(d.spots.length).toBeLessThanOrEqual(3);
  }
});

test('landing range is a sane angular distance', () => {
  expect(LANDING_RANGE_DEG).toBeGreaterThan(5);
  expect(LANDING_RANGE_DEG).toBeLessThan(30);
});

test('every destination has a non-empty blurb', () => {
  for (const d of DESTINATIONS) {
    expect(typeof d.blurb).toBe('string');
    expect(d.blurb.trim().length).toBeGreaterThan(0);
  }
});

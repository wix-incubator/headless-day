import { heightAt, isOnLand, MAX_LAND_HEIGHT } from './terrain';
import { DESTINATIONS } from '../data/destinations';

describe('terrain height', () => {
  test('mid-ocean points are exactly flat', () => {
    // open Pacific and open Atlantic — nowhere near any landmass ring or island dot
    expect(heightAt(0, -160)).toBe(0);
    expect(heightAt(10, -30)).toBe(0);
  });

  test('ocean is always land-negative', () => {
    expect(isOnLand(0, -160)).toBe(false);
  });

  test('every destination sits on land with a bounded, non-zero height', () => {
    for (const d of DESTINATIONS) {
      expect(isOnLand(d.lat, d.lng)).toBe(true);
      const h = heightAt(d.lat, d.lng);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThanOrEqual(MAX_LAND_HEIGHT);
    }
  });

  test('is deterministic: same lat/lng always returns the same height', () => {
    const a = heightAt(38.99, -9.42);
    const b = heightAt(38.99, -9.42);
    expect(a).toBe(b);
  });

  test('height never exceeds the documented ceiling anywhere on a coarse land sample', () => {
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lng = -180; lng < 180; lng += 15) {
        const h = heightAt(lat, lng);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(MAX_LAND_HEIGHT);
      }
    }
  });
});

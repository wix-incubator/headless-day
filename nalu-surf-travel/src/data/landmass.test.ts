import { LAND, ISLANDS } from './landmass';
import { DESTINATIONS } from './destinations';

const DEG_PER_PX_AT_2048 = 360 / 2048;

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isOnLand(lat: number, lng: number): boolean {
  let ringHits = 0;
  for (const ring of LAND) if (pointInRing(lng, lat, ring)) ringHits++;
  if (ringHits % 2 === 1) return true;
  return ISLANDS.some((isl) => Math.hypot(lng - isl.lng, lat - isl.lat) <= isl.r * DEG_PER_PX_AT_2048);
}

describe('landmass data', () => {
  test('stays within the ≤3,500 total-point budget', () => {
    const total = LAND.reduce((sum, ring) => sum + ring.length, 0);
    expect(total).toBeLessThanOrEqual(3500);
  });

  test('every ring has at least 3 points', () => {
    for (const ring of LAND) expect(ring.length).toBeGreaterThanOrEqual(3);
  });

  test('no ring crosses the antimeridian except the benign polar seam', () => {
    for (const ring of LAND) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        if (Math.abs(a[0] - b[0]) > 180) {
          // The only legitimate case is Antarctica's ring closing along the map's
          // bottom edge (lng flips 180 -> -180 while lat stays pinned near the pole).
          expect(a[1]).toBeLessThan(-85);
          expect(b[1]).toBeLessThan(-85);
        }
      }
    }
  });

  test('every destination pin sits on painted land', () => {
    for (const dest of DESTINATIONS) {
      expect(isOnLand(dest.lat, dest.lng)).toBe(true);
    }
  });

  test('Oahu sits on a hand-placed Hawaii dot, not just the raw polygon', () => {
    const oahu = DESTINATIONS.find((d) => d.id === 'oahu')!;
    const onIslandDot = ISLANDS.some(
      (isl) => Math.hypot(oahu.lng - isl.lng, oahu.lat - isl.lat) <= isl.r * DEG_PER_PX_AT_2048,
    );
    expect(onIslandDot).toBe(true);
  });

  test('spot-checks recognizable continents are present (non-trivial ring count)', () => {
    expect(LAND.length).toBeGreaterThan(50);
  });
});

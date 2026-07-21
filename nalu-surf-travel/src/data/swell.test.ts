import { DESTINATIONS } from './destinations';
import { SWELL_SOURCES } from './swell';

test('every destination appears in exactly one swell source\'s feeds', () => {
  for (const d of DESTINATIONS) {
    const count = SWELL_SOURCES.filter((s) => s.feeds.includes(d.id)).length;
    expect(count).toBe(1);
  }
});

test('every fed id is a real destination and source ids/coords are sane', () => {
  const ids = new Set(DESTINATIONS.map((d) => d.id));
  for (const s of SWELL_SOURCES) {
    expect(s.feeds.length).toBeGreaterThan(0);
    for (const id of s.feeds) expect(ids.has(id)).toBe(true);
    expect(s.lat).toBeGreaterThanOrEqual(-90);
    expect(s.lat).toBeLessThanOrEqual(90);
    expect(s.lng).toBeGreaterThan(-180);
    expect(s.lng).toBeLessThanOrEqual(180);
  }
});

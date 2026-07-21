import { VIGNETTES } from './vignettes';
import { DESTINATIONS } from './destinations';

test('every destination has vignette placement data', () => {
  for (const dest of DESTINATIONS) {
    expect(VIGNETTES[dest.id]).toBeDefined();
  }
});

test('touchdown coords are within a plausible range of the destination itself', () => {
  for (const dest of DESTINATIONS) {
    const { touchdown } = VIGNETTES[dest.id];
    expect(Math.abs(touchdown.lat - dest.lat)).toBeLessThan(5);
    expect(Math.abs(touchdown.lng - dest.lng)).toBeLessThan(5);
  }
});

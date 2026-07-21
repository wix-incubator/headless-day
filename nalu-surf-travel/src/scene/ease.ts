export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInQuad = (t: number): number => t * t;

// Not in the §0 table, but §4a/§4b's particle FX explicitly call for it ("scale→0 and
// opacity→0 (easeOutQuad)") — added as the obvious counterpart to easeInQuad.
export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

export const easeOutBack = (t: number): number =>
  1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Clamp t to [0,1] and remap [from,to] -> [0,1] before applying an ease; 0 before, 1 after. */
export function phase(t: number, from: number, to: number): number {
  if (t <= from) return 0;
  if (t >= to) return 1;
  return (t - from) / (to - from);
}

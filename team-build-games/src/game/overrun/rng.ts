/**
 * Coordinate-hash RNG (murmur3-style mixing): every draw is a pure function of
 * (seed, ...stable coordinates) — there is NO advancing cursor, so an extra or
 * missing draw upstream can never shift downstream values, and host migration
 * (which reconstructs the world from a snapshot-carried seed) can't fork RNG state.
 */

function mix(h: number, x: number): number {
  let k = Math.imul(x | 0, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic draw in [0, 1) for the given seed + coordinates (numbers are floored). */
export function hash01(seed: number, ...coords: (number | string)[]): number {
  let h = seed | 0;
  for (const c of coords) {
    if (typeof c === "string") {
      for (let i = 0; i < c.length; i++) h = mix(h, c.charCodeAt(i));
      h = mix(h, c.length | 0x40000000); // length marker: "ab","c" ≠ "a","bc"
    } else {
      h = mix(h, Math.floor(c));
      h = mix(h, 0x9e3779b9); // type marker so number/string sequences can't collide trivially
    }
  }
  return fmix(h) / 4294967296;
}

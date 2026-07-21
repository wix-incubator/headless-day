import { FLAG_DRAWERS, type FlagCtx } from './flags';
import { DESTINATIONS } from '../data/destinations';

/** A plain recording fake for the narrow `FlagCtx` surface — no jsdom canvas backend
 * required (see `flags.ts`'s comment on why the real `getContext('2d')` isn't testable
 * here). Counts draw calls so each destination's drawer can be asserted to have actually
 * painted something, not just returned silently. */
function fakeCtx(): FlagCtx & { fillCount: number; strokeCount: number } {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    fillCount: 0, strokeCount: 0,
    save() {}, restore() {}, translate() {}, rotate() {},
    fillRect() { this.fillCount++; },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    fill() { this.fillCount++; },
    stroke() { this.strokeCount++; },
  };
}

describe('flag textures', () => {
  test('covers every destination id', () => {
    for (const dest of DESTINATIONS) {
      expect(FLAG_DRAWERS[dest.id]).toBeTypeOf('function');
    }
    expect(Object.keys(FLAG_DRAWERS).sort()).toEqual(DESTINATIONS.map((d) => d.id).sort());
  });

  test('every drawer paints onto the context without throwing', () => {
    for (const [id, draw] of Object.entries(FLAG_DRAWERS)) {
      const ctx = fakeCtx();
      expect(() => draw(ctx, 128, 80)).not.toThrow();
      expect(ctx.fillCount + ctx.strokeCount).toBeGreaterThan(0);
    }
  });

  test('Morocco is the one drawer that strokes an emblem rather than only filling', () => {
    const ctx = fakeCtx();
    FLAG_DRAWERS.taghazout(ctx, 128, 80);
    expect(ctx.strokeCount).toBeGreaterThan(0);
  });
});

import { easeOutCubic, easeInOutCubic, easeInQuad, easeOutQuad, easeOutBack, easeInOutSine, phase } from './ease';

describe('easing library', () => {
  test.each([
    ['easeOutCubic', easeOutCubic],
    ['easeInOutCubic', easeInOutCubic],
    ['easeInQuad', easeInQuad],
    ['easeOutQuad', easeOutQuad],
    ['easeOutBack', easeOutBack],
    ['easeInOutSine', easeInOutSine],
  ])('%s maps 0 -> 0 and 1 -> 1', (_name, fn) => {
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
  });

  test('easeOutCubic is fast-out (front-loaded)', () => {
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
  });

  test('easeInQuad is slow-out (back-loaded)', () => {
    expect(easeInQuad(0.25)).toBeLessThan(0.25);
  });

  test('easeOutQuad is fast-out (front-loaded)', () => {
    expect(easeOutQuad(0.25)).toBeGreaterThan(0.25);
  });

  test('easeInOutCubic is symmetric around the midpoint', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  test('easeOutBack overshoots past 1 before settling', () => {
    let maxVal = 0;
    for (let t = 0; t <= 1; t += 0.01) maxVal = Math.max(maxVal, easeOutBack(t));
    expect(maxVal).toBeGreaterThan(1);
  });

  test('easeInOutSine is symmetric around the midpoint', () => {
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
  });
});

describe('phase', () => {
  test('is 0 before the window and 1 after', () => {
    expect(phase(0, 0.5, 1)).toBe(0);
    expect(phase(0.4, 0.5, 1)).toBe(0);
    expect(phase(1.5, 0.5, 1)).toBe(1);
  });

  test('interpolates linearly inside the window', () => {
    expect(phase(0.75, 0.5, 1)).toBeCloseTo(0.5);
  });
});

import { ringTransform } from './swell';

test('alpha -> 0: center approaches S*R, radius approaches 0', () => {
  const S: [number, number, number] = [0, 0, 1];
  const { center, radius, axis } = ringTransform(S, 1e-4, 1.002);
  expect(center[0]).toBeCloseTo(0, 3);
  expect(center[1]).toBeCloseTo(0, 3);
  expect(center[2]).toBeCloseTo(1.002, 3);
  expect(radius).toBeCloseTo(0, 3);
  expect(axis).toEqual([0, 0, 1]);
});

test('alpha = pi/2: center approaches the origin, radius approaches R', () => {
  const S: [number, number, number] = [1, 0, 0];
  const { center, radius } = ringTransform(S, Math.PI / 2, 1.002);
  expect(center[0]).toBeCloseTo(0, 5);
  expect(center[1]).toBeCloseTo(0, 5);
  expect(center[2]).toBeCloseTo(0, 5);
  expect(radius).toBeCloseTo(1.002, 5);
});

test('center is always S*cos(alpha)*R, for any source direction and alpha', () => {
  const sources: [number, number, number][] = [
    [0, 0, 1], [1, 0, 0], [0, 1, 0], [0.6, 0.8, 0], [-0.3, 0.5, 0.8106],
  ];
  const alphas = [0.05, 0.5, 1.0, 1.9, 2.8];
  const R = 1.002;
  for (const S of sources) {
    for (const alpha of alphas) {
      const { center, axis } = ringTransform(S, alpha, R);
      const [ux, uy, uz] = axis;
      expect(center[0]).toBeCloseTo(ux * Math.cos(alpha) * R, 6);
      expect(center[1]).toBeCloseTo(uy * Math.cos(alpha) * R, 6);
      expect(center[2]).toBeCloseTo(uz * Math.cos(alpha) * R, 6);
    }
  }
});

test('radius is always sin(alpha)*R', () => {
  const S: [number, number, number] = [0, 1, 0];
  for (const alpha of [0.1, 0.7, 1.3, 2.4]) {
    const { radius } = ringTransform(S, alpha, 1.002);
    expect(radius).toBeCloseTo(Math.sin(alpha) * 1.002, 6);
  }
});

test('normalizes a non-unit source vector so axis is always unit length', () => {
  const { axis } = ringTransform([0, 0, 2], 0.3, 1);
  expect(Math.hypot(...axis)).toBeCloseTo(1, 6);
  expect(axis).toEqual([0, 0, 1]);
});

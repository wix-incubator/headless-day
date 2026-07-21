import { latLngToVec3, vec3ToLatLng } from './geo';

test('lat 0 lng 0 points at +Z', () => {
  const [x, y, z] = latLngToVec3(0, 0, 1);
  expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(1);
});

test('north pole points at +Y', () => {
  const [x, y, z] = latLngToVec3(90, 0, 1);
  expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(1); expect(z).toBeCloseTo(0);
});

test('lng 90 points at +X and radius scales', () => {
  const [x, y, z] = latLngToVec3(0, 90, 2);
  expect(x).toBeCloseTo(2); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(0);
});

test('vec3ToLatLng round-trips latLngToVec3 for a range of coordinates', () => {
  const cases: [number, number][] = [[0, 0], [21.6, -158.1], [-8.8, 115.1], [38.99, -9.42], [-34.05, 24.93], [89, 45], [-89, -170]];
  for (const [lat, lng] of cases) {
    const [x, y, z] = latLngToVec3(lat, lng, 1);
    const back = vec3ToLatLng(x, y, z);
    expect(back.lat).toBeCloseTo(lat, 5);
    expect(back.lng).toBeCloseTo(lng, 5);
  }
});

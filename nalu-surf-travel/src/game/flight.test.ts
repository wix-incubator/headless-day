import { stepFlight, angularDistanceDeg, nearestDestination, shortestAngleDeg } from './flight';
import { DESTINATIONS } from '../data/destinations';

const at = (lat: number, lng: number) => ({ lat, lng, headingDeg: 0 });

test('ArrowUp moves north at 30 deg/sec', () => {
  expect(stepFlight(at(0, 0), { dx: 0, dy: 1 }, 1).lat).toBeCloseTo(30);
});

test('longitude wraps across the antimeridian', () => {
  expect(stepFlight(at(0, 179), { dx: 1, dy: 0 }, 1).lng).toBeCloseTo(-151);
});

test('latitude clamps at ±80', () => {
  expect(stepFlight(at(79, 0), { dx: 0, dy: 1 }, 1).lat).toBe(80);
  expect(stepFlight(at(-79, 0), { dx: 0, dy: -1 }, 1).lat).toBe(-80);
});

test('heading follows movement direction, kept when idle', () => {
  expect(stepFlight(at(0, 0), { dx: 1, dy: 0 }, 0.1).headingDeg).toBeCloseTo(90);
  expect(stepFlight({ lat: 0, lng: 0, headingDeg: 42 }, { dx: 0, dy: 0 }, 0.1).headingDeg).toBe(42);
});

test('angular distance: quarter turn along the equator is 90°', () => {
  expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(90);
  expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(angularDistanceDeg(0, 90, 0, 0));
});

test('nearestDestination finds Oahu in range, null far away', () => {
  const nearOahu = at(20, -160);
  expect(nearestDestination(nearOahu, DESTINATIONS, 14)?.dest.id).toBe('oahu');
  expect(nearestDestination(at(0, 40), DESTINATIONS, 14)).toBeNull();
});

test('shortestAngleDeg goes the short way around', () => {
  expect(shortestAngleDeg(350, 10)).toBeCloseTo(20);
  expect(shortestAngleDeg(10, 350)).toBeCloseTo(-20);
});

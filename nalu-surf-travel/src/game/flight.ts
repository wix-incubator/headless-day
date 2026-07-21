import type { Destination } from '../data/destinations';

export interface FlightState { lat: number; lng: number; headingDeg: number }
export interface FlightInput { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

const MAX_LAT = 80;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function wrapLng(lng: number): number {
  let x = ((lng + 180) % 360 + 360) % 360 - 180;
  return x === -180 ? 180 : x;
}

export function stepFlight(
  s: FlightState, input: FlightInput, dtSec: number, speedDegPerSec = 30,
): FlightState {
  const step = speedDegPerSec * dtSec;
  const lat = Math.min(MAX_LAT, Math.max(-MAX_LAT, s.lat + input.dy * step));
  const lng = wrapLng(s.lng + input.dx * step);
  const moving = input.dx !== 0 || input.dy !== 0;
  const headingDeg = moving ? deg(Math.atan2(input.dx, input.dy)) : s.headingDeg;
  return { lat, lng, headingDeg };
}

/** Central angle between two points on the sphere, in degrees. */
export function angularDistanceDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const cosc =
    Math.sin(rad(aLat)) * Math.sin(rad(bLat)) +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng - aLng));
  return deg(Math.acos(Math.min(1, Math.max(-1, cosc))));
}

export function nearestDestination(
  s: FlightState, dests: Destination[], rangeDeg: number,
): { dest: Destination; distanceDeg: number } | null {
  let best: { dest: Destination; distanceDeg: number } | null = null;
  for (const dest of dests) {
    const distanceDeg = angularDistanceDeg(s.lat, s.lng, dest.lat, dest.lng);
    if (distanceDeg <= rangeDeg && (!best || distanceDeg < best.distanceDeg)) {
      best = { dest, distanceDeg };
    }
  }
  return best;
}

/** Signed shortest rotation from one angle to another, in (-180, 180]. */
export function shortestAngleDeg(fromDeg: number, toDeg: number): number {
  return wrapLng(toDeg - fromDeg);
}

export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

/** lat/lng (deg) → position on a sphere of given radius; (0,0) faces +Z. */
export function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const φ = rad(lat), λ = rad(lng);
  return [radius * Math.cos(φ) * Math.sin(λ), radius * Math.sin(φ), radius * Math.cos(φ) * Math.cos(λ)];
}

/** Inverse of `latLngToVec3` — recovers lat/lng (deg) from a point on (or near) a sphere
 * centered at the origin. Added for terrain relief (§ addendum): the displaced globe's own
 * vertex positions need to look up their source lat/lng to sample the height function. */
export function vec3ToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const radius = Math.hypot(x, y, z) || 1;
  const lat = deg(Math.asin(Math.min(1, Math.max(-1, y / radius))));
  const lng = deg(Math.atan2(x, z));
  return { lat, lng };
}

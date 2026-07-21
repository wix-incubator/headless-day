export interface RingTransform {
  center: [number, number, number];
  radius: number;
  axis: [number, number, number];
}

/** A swell front at angular radius α from a storm source S (unit vector on the globe) is a
 * small-circle: a planar ring centered at `S·cosα·R`, radius `sinα·R`, lying in the plane
 * perpendicular to S — S itself is the ring's axis. This is the crux of "storm-swell trains"
 * (thesis §2C): great-circle swell propagation, which is a distorted mess on a flat map, is
 * exactly this one closed form on a sphere.
 *
 * Defensively normalizes `sourceUnitVec` (callers should already pass a unit vector, e.g.
 * from `latLngToVec3`) so a slightly-off-unit input can't silently shrink/grow the ring. */
export function ringTransform(
  sourceUnitVec: [number, number, number],
  alpha: number,
  R: number,
): RingTransform {
  const [sx, sy, sz] = sourceUnitVec;
  const len = Math.hypot(sx, sy, sz) || 1;
  const ux = sx / len, uy = sy / len, uz = sz / len;
  const c = Math.cos(alpha) * R;
  return {
    center: [ux * c, uy * c, uz * c],
    radius: Math.sin(alpha) * R,
    axis: [ux, uy, uz],
  };
}

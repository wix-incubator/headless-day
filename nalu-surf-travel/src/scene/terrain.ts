import { LAND, ISLANDS } from '../data/landmass';

// Owner request 2026-07-12 (addendum, docs/brand/2026-07-11-art-direction.md): subtle toy
// relief on land, flat ocean. Kept well under the spec's 0.025-0.035R ceiling headroom.
export const MAX_LAND_HEIGHT = 0.032;

interface RingBounds { minLng: number; maxLng: number; minLat: number; maxLat: number; ring: [number, number][] }

let ringBoundsCache: RingBounds[] | null = null;

/** Per-ring bounding boxes, computed once and cached — lets `isOnLand` skip the expensive
 * point-in-ring walk for the ~150 rings that obviously can't contain a given point, which
 * is what keeps a full-sphere vertex pass (thousands of calls) cheap enough to run once at
 * geometry-build time. */
function ringBoundsList(): RingBounds[] {
  if (ringBoundsCache) return ringBoundsCache;
  ringBoundsCache = LAND.map((ring) => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return { minLng, maxLng, minLat, maxLat, ring };
  });
  return ringBoundsCache;
}

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const DEG_PER_PX_AT_2048 = 360 / 2048;

/** Same land test the earth texture's coastline paints onto (§1 of the art-direction spec)
 * — the single source of truth for "is this lat/lng land or ocean", reused here so terrain
 * relief, markers/flags, and the bird's landing offset all agree with what's actually painted. */
export function isOnLand(lat: number, lng: number): boolean {
  let ringHits = 0;
  for (const { minLng, maxLng, minLat, maxLat, ring } of ringBoundsList()) {
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    if (pointInRing(lng, lat, ring)) ringHits++;
  }
  if (ringHits % 2 === 1) return true;
  return ISLANDS.some((isl) => Math.hypot(lng - isl.lng, lat - isl.lat) <= isl.r * DEG_PER_PX_AT_2048);
}

/** Deterministic hash -> [0,1); same lat/lng always yields the same value (no Math.random),
 * so the relief is stable across mounts and reruns. */
function hash01(lat: number, lng: number): number {
  const h = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

const NOISE_CELL_DEG = 3.5; // coarse enough to read as continent-scale ridges, not per-vertex static

/** Bilinear-interpolated value noise over a fixed-size lat/lng grid — cheap (4 hash calls +
 * 2 lerps) and smooth, so land relief reads as soft toy bumps rather than jagged steps. */
function ridgeNoise01(lat: number, lng: number): number {
  const latF = lat / NOISE_CELL_DEG;
  const lngF = lng / NOISE_CELL_DEG;
  const lat0 = Math.floor(latF), lng0 = Math.floor(lngF);
  const tLat = latF - lat0, tLng = lngF - lng0;
  const h00 = hash01(lat0, lng0);
  const h10 = hash01(lat0, lng0 + 1);
  const h01 = hash01(lat0 + 1, lng0);
  const h11 = hash01(lat0 + 1, lng0 + 1);
  const top = h00 + (h10 - h00) * tLng;
  const bottom = h01 + (h11 - h01) * tLng;
  return top + (bottom - top) * tLat;
}

/** Displacement (globe-radius units) to apply at this lat/lng: 0 on ocean, a subtle
 * deterministic ridge value on land (never fully flat, never over `MAX_LAND_HEIGHT`). */
export function heightAt(lat: number, lng: number): number {
  if (!isOnLand(lat, lng)) return 0;
  const n = ridgeNoise01(lat, lng);
  return MAX_LAND_HEIGHT * (0.35 + 0.65 * n);
}

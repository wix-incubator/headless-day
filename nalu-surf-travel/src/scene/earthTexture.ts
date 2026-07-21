import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { LAND, ISLANDS } from '../data/landmass';

const COLORS = {
  oceanDeep: '#157A96',
  swell: '#2490A8',
  reef: '#58D3C7',
  foam: '#FFFDF7',
  land: '#8FD07E',
  land2: '#5FB56E',
  sand: '#F2D8A7',
  ice: '#FFFDF7',
};

/** Deterministic seeded PRNG (mulberry32) so the second-green splotches are stable across mounts. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function continentPath(W: number, H: number): Path2D {
  const x = (lng: number) => ((lng + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;
  const path = new Path2D();
  for (const ring of LAND) {
    ring.forEach(([lng, lat], i) => {
      const px = x(lng), py = y(lat);
      if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
    });
    path.closePath();
  }
  return path;
}

function islandsPath(W: number, H: number): Path2D {
  const x = (lng: number) => ((lng + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;
  const path = new Path2D();
  for (const isl of ISLANDS) {
    const r = isl.r * (W / 2048);
    path.moveTo(x(isl.lng) + r, y(isl.lat));
    path.arc(x(isl.lng), y(isl.lat), r, 0, Math.PI * 2);
  }
  return path;
}

/** Stroke a path 3x horizontally (at -W, 0, +W) so RepeatWrapping tiles seamlessly at the seam. */
function strokeWrapped(ctx: CanvasRenderingContext2D, path: Path2D, W: number, width: number, color: string, alpha = 1) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  for (const dx of [-W, 0, W]) {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.stroke(path);
    ctx.restore();
  }
  ctx.restore();
}

function fillWrapped(ctx: CanvasRenderingContext2D, path: Path2D, W: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  for (const dx of [-W, 0, W]) {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.fill(path, 'evenodd');
    ctx.restore();
  }
  ctx.restore();
}

/** Coast rings (§1c step 2–4): swell arcs, reef shallows, foam trim.
 * Continents and islands use separately-specified absolute widths (islands are
 * NOT a scaled-down fraction of the continent widths — the spec gives islands
 * their own fixed, smaller stroke recipe so a 6px dot doesn't drown in a 150px band). */
function paintCoastBands(
  ctx: CanvasRenderingContext2D, path: Path2D, W: number,
  widths: { swell: [number, number, number, number]; reef: [number, number]; foam: number },
) {
  const s = (n: number) => n * (W / 2048);
  const [w1, w2, w3, w4] = widths.swell;
  strokeWrapped(ctx, path, W, s(w1), COLORS.swell, 0.35);
  strokeWrapped(ctx, path, W, s(w2), COLORS.oceanDeep, 1);
  strokeWrapped(ctx, path, W, s(w3), COLORS.swell, 0.55);
  strokeWrapped(ctx, path, W, s(w4), COLORS.oceanDeep, 1);
  const [r1, r2] = widths.reef;
  strokeWrapped(ctx, path, W, s(r1), COLORS.reef, 0.8);
  strokeWrapped(ctx, path, W, s(r2), COLORS.reef, 1);
  strokeWrapped(ctx, path, W, s(widths.foam), COLORS.foam, 1);
}

const CONTINENT_COAST = { swell: [150, 116, 82, 48] as [number, number, number, number], reef: [30, 18] as [number, number], foam: 5 };
const ISLAND_COAST = { swell: [40, 30, 22, 12] as [number, number, number, number], reef: [10, 6] as [number, number], foam: 3 };

function paintSandBands(ctx: CanvasRenderingContext2D, land: Path2D, W: number, H: number) {
  const y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.save();
  ctx.clip(land, 'evenodd');
  const bands: [number, number][] = [
    [33, 12],
    [-12, -33],
  ];
  for (const [latA, latB] of bands) {
    const yA = y(latA), yB = y(latB);
    const grad = ctx.createLinearGradient(0, Math.min(yA, yB), 0, Math.max(yA, yB));
    grad.addColorStop(0, hexAlpha(COLORS.sand, 0));
    grad.addColorStop(0.5, hexAlpha(COLORS.sand, 0.9));
    grad.addColorStop(1, hexAlpha(COLORS.sand, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.min(yA, yB), W, Math.abs(yB - yA));
  }
  ctx.restore();
}

function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function paintSecondGreen(ctx: CanvasRenderingContext2D, land: Path2D, W: number, H: number) {
  const rand = mulberry32(7);
  ctx.save();
  ctx.clip(land, 'evenodd');
  ctx.fillStyle = hexAlpha(COLORS.land2, 0.5);
  const x = (lng: number) => ((lng + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;
  for (let i = 0; i < 28; i++) {
    const lat = -55 + rand() * 115;
    const lng = -180 + rand() * 360;
    const r = (25 + rand() * 45) * (W / 2048);
    ctx.beginPath();
    ctx.ellipse(x(lng), y(lat), r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintIceCaps(ctx: CanvasRenderingContext2D, land: Path2D, W: number, H: number) {
  const y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.save();
  ctx.clip(land, 'evenodd');
  const edge = 30 * (W / 2048);
  // north cap: solid poleward of 66, soft fade down to the fill's inner edge
  const north = ctx.createLinearGradient(0, 0, 0, y(66) + edge);
  north.addColorStop(0, hexAlpha(COLORS.ice, 1));
  north.addColorStop(Math.max(0, (y(66) - edge) / (y(66) + edge)), hexAlpha(COLORS.ice, 1));
  north.addColorStop(1, hexAlpha(COLORS.ice, 0));
  ctx.fillStyle = north;
  ctx.fillRect(0, 0, W, y(66) + edge);

  const south = ctx.createLinearGradient(0, y(-66) - edge, 0, H);
  south.addColorStop(0, hexAlpha(COLORS.ice, 0));
  const stop = Math.min(1, edge * 2 / (H - (y(-66) - edge)));
  south.addColorStop(stop, hexAlpha(COLORS.ice, 1));
  south.addColorStop(1, hexAlpha(COLORS.ice, 1));
  ctx.fillStyle = south;
  ctx.fillRect(0, y(-66) - edge, W, H - (y(-66) - edge));
  ctx.restore();
}

/** Builds the equirectangular Earth canvas once (§1c paint order) and wraps it as a CanvasTexture. */
export function createEarthTexture(width: number): CanvasTexture {
  const W = width;
  const H = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. deep ocean fill
  ctx.fillStyle = COLORS.oceanDeep;
  ctx.fillRect(0, 0, W, H);

  const continents = continentPath(W, H);
  const islands = islandsPath(W, H);

  // 2-4. swell lines, reef shallows, foam trim — continents at full scale, islands
  // at their own smaller fixed widths (an island dot would drown in a 150px band).
  paintCoastBands(ctx, continents, W, CONTINENT_COAST);
  paintCoastBands(ctx, islands, W, ISLAND_COAST);

  // 5. land fill (continents + hand-placed island dots)
  fillWrapped(ctx, continents, W, COLORS.land);
  fillWrapped(ctx, islands, W, COLORS.land);

  // steps 6-8 clip to the land shape via ctx.clip(), not globalCompositeOperation:
  // by this point the whole canvas (ocean + land) is already fully opaque, so
  // 'source-atop' (as the literal recipe reads) can't distinguish land from ocean —
  // it would paint the sand/greenery/ice bands straight across the water too.
  const landMask = new Path2D();
  landMask.addPath(continents);
  landMask.addPath(islands);

  // 6. sand bands (clipped to land)
  paintSandBands(ctx, landMask, W, H);

  // 7. second green (clipped to land)
  paintSecondGreen(ctx, landMask, W, H);

  // 8. ice caps (clipped to land)
  paintIceCaps(ctx, landMask, W, H);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.offset.x = 0.25;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** 1024 on narrow/low-dpr screens, 2048 otherwise (art-direction §0 budgets). */
export function earthTextureWidth(): number {
  if (typeof window === 'undefined') return 2048;
  const narrow = window.innerWidth < 720;
  const lowDpr = window.devicePixelRatio === 1;
  return narrow || lowDpr ? 1024 : 2048;
}

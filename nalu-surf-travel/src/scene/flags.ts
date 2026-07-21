import { CanvasTexture, LinearFilter } from 'three';

/** Minimal canvas-2d surface this module draws on — deliberately narrower than the real
 * `CanvasRenderingContext2D` so `flags.test.ts` can pass a plain object instead of needing
 * jsdom's canvas backend (not installed here; `getContext('2d')` returns null under jsdom
 * without the optional `canvas` package, same constraint `earthTexture.ts` sidesteps by
 * never being unit-tested directly). Each draw function is pure: given a context and a
 * size, it only issues drawing calls — no canvas/document access of its own. */
export interface FlagCtx {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(rad: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  fill(): void;
  stroke(): void;
}

function stripes(ctx: FlagCtx, w: number, h: number, colors: string[]) {
  const bandH = h / colors.length;
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * bandH, w, bandH);
  });
}

function star(ctx: FlagCtx, cx: number, cy: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// oahu — Hawaii, USA: red/white stripes + navy canton with one simplified star
// (skipping the real 50-star grid — "simplified but recognizable" per the brief).
function drawOahu(ctx: FlagCtx, w: number, h: number) {
  stripes(ctx, w, h, ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234']);
  ctx.fillStyle = '#122E63';
  ctx.fillRect(0, 0, w * 0.42, h * 0.56);
  ctx.fillStyle = '#FFFFFF';
  star(ctx, w * 0.21, h * 0.28, h * 0.16, h * 0.065);
  ctx.fill();
}

// bali — Indonesia: red over white, no emblem in the real flag either.
function drawBali(ctx: FlagCtx, w: number, h: number) {
  stripes(ctx, w, h, ['#CE1126', '#FFFFFF']);
}

// ericeira — Portugal: green/red fields + a simplified gold emblem circle standing in
// for the full armillary-sphere/shield ("a simplified emblem circle is fine" per the brief).
function drawEriceira(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#046A38';
  ctx.fillRect(0, 0, w * 0.4, h);
  ctx.fillStyle = '#DA291C';
  ctx.fillRect(w * 0.4, 0, w * 0.6, h);
  ctx.fillStyle = '#FFD400';
  ctx.beginPath();
  ctx.arc(w * 0.4, h * 0.5, h * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#DA291C';
  ctx.beginPath();
  ctx.arc(w * 0.4, h * 0.5, h * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

// taghazout — Morocco: red field, green pentagram outline (stroke only, per the brief).
function drawTaghazout(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#C1272D';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#006233';
  ctx.lineWidth = h * 0.045;
  star(ctx, w * 0.5, h * 0.5, h * 0.3, h * 0.115);
  ctx.stroke();
}

// nosara — Costa Rica: blue/white/red(double-width)/white/blue, no coat of arms.
function drawNosara(ctx: FlagCtx, w: number, h: number) {
  const unit = h / 6;
  const bands: [string, number][] = [
    ['#002B7F', unit], ['#FFFFFF', unit], ['#CE1126', unit * 2], ['#FFFFFF', unit], ['#002B7F', unit],
  ];
  let y = 0;
  for (const [color, bandH] of bands) {
    ctx.fillStyle = color;
    ctx.fillRect(0, y, w, bandH);
    y += bandH;
  }
}

// jbay — South Africa: simplified Y-layout in six colors (black hoist triangle, gold-bordered
// green Y dividing a red top field from a blue bottom field, white borders on the Y).
function drawJbay(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#DE3831';
  ctx.fillRect(0, 0, w, h * 0.5);
  ctx.fillStyle = '#002395';
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  const armW = h * 0.34;
  ctx.fillStyle = '#FFB81C';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.42, h * 0.5);
  ctx.lineTo(0, h);
  ctx.lineTo(0, h * 0.5 + armW * 0.75);
  ctx.lineTo(w * 0.3, h * 0.5);
  ctx.lineTo(0, h * 0.5 - armW * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#007A4D';
  const g = armW * 0.55;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5 - g / 2);
  ctx.lineTo(w * 0.34, h * 0.5 - g / 2);
  ctx.lineTo(w * 0.34, h * 0.5 + g / 2);
  ctx.lineTo(0, h * 0.5 + g / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.22, h * 0.5);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

// hossegor — France: blue/white/red vertical bands.
function drawHossegor(ctx: FlagCtx, w: number, h: number) {
  const bandW = w / 3;
  ctx.fillStyle = '#002395';
  ctx.fillRect(0, 0, bandW, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bandW, 0, bandW, h);
  ctx.fillStyle = '#ED2939';
  ctx.fillRect(bandW * 2, 0, bandW, h);
}

// puerto — Mexico: green/white/red vertical bands + a small central brown/red emblem
// circle standing in for the full eagle-and-serpent coat of arms.
function drawPuerto(ctx: FlagCtx, w: number, h: number) {
  const bandW = w / 3;
  ctx.fillStyle = '#006341';
  ctx.fillRect(0, 0, bandW, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bandW, 0, bandW, h);
  ctx.fillStyle = '#CE1126';
  ctx.fillRect(bandW * 2, 0, bandW, h);
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A32638';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

// teahupoo — French Polynesia: red/white/red horizontal bands + a small central emblem circle.
function drawTeahupoo(ctx: FlagCtx, w: number, h: number) {
  const unit = h / 3;
  stripes(ctx, w, h, ['#CE1126', '#FFFFFF', '#CE1126']);
  ctx.fillStyle = '#002395';
  ctx.beginPath();
  ctx.arc(w * 0.5, unit * 1.5, unit * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD100';
  ctx.beginPath();
  ctx.arc(w * 0.5, unit * 1.5, unit * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

// Shared simplified Union Jack canton for the three Commonwealth flags below — white
// +/x crosses with a red overlay, filling the given canton rectangle.
function unionJackCanton(ctx: FlagCtx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#00247D';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y + h * 0.42, w, h * 0.16);
  ctx.fillRect(x + w * 0.42, y, w * 0.16, h);
  ctx.save();
  ctx.translate(x + w * 0.5, y + h * 0.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-w * 0.75, -h * 0.09, w * 1.5, h * 0.18);
  ctx.fillRect(-w * 0.09, -h * 0.75, w * 0.18, h * 1.5);
  ctx.restore();
  ctx.fillStyle = '#CF142B';
  ctx.fillRect(x, y + h * 0.46, w, h * 0.08);
  ctx.fillRect(x + w * 0.46, y, w * 0.08, h);
}

// snapper — Australia: navy field + Union Jack canton + a few white stars
// (Southern Cross + Commonwealth star) on the right.
function drawSnapper(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#00247D';
  ctx.fillRect(0, 0, w, h);
  unionJackCanton(ctx, 0, 0, w * 0.5, h * 0.5);
  ctx.fillStyle = '#FFFFFF';
  star(ctx, w * 0.22, h * 0.75, h * 0.09, h * 0.036);
  ctx.fill();
  const cross: [number, number][] = [
    [0.72, 0.18], [0.85, 0.32], [0.9, 0.55], [0.78, 0.72], [0.68, 0.5],
  ];
  for (const [cx, cy] of cross) {
    star(ctx, w * cx, h * cy, h * 0.06, h * 0.024);
    ctx.fill();
  }
}

// raglan — New Zealand: navy field + Union Jack canton + 4 red-with-white-edge stars
// (Southern Cross) on the right.
function drawRaglan(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#00247D';
  ctx.fillRect(0, 0, w, h);
  unionJackCanton(ctx, 0, 0, w * 0.5, h * 0.5);
  const cross: [number, number][] = [[0.72, 0.2], [0.86, 0.42], [0.82, 0.68], [0.66, 0.55]];
  for (const [cx, cy] of cross) {
    ctx.fillStyle = '#FFFFFF';
    star(ctx, w * cx, h * cy, h * 0.075, h * 0.03);
    ctx.fill();
    ctx.fillStyle = '#CC142B';
    star(ctx, w * cx, h * cy, h * 0.06, h * 0.024);
    ctx.fill();
  }
}

// cloudbreak — Fiji: light-blue field + Union Jack canton + a small shield on the right.
function drawCloudbreak(ctx: FlagCtx, w: number, h: number) {
  ctx.fillStyle = '#68A7DE';
  ctx.fillRect(0, 0, w, h);
  unionJackCanton(ctx, 0, 0, w * 0.5, h * 0.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(w * 0.68, h * 0.32, w * 0.2, h * 0.32);
  ctx.fillStyle = '#CE1126';
  ctx.beginPath();
  ctx.moveTo(w * 0.68, h * 0.32);
  ctx.lineTo(w * 0.88, h * 0.32);
  ctx.lineTo(w * 0.88, h * 0.5);
  ctx.lineTo(w * 0.78, h * 0.6);
  ctx.lineTo(w * 0.68, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFD100';
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.42, h * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

export const FLAG_DRAWERS: Record<string, (ctx: FlagCtx, w: number, h: number) => void> = {
  oahu: drawOahu,
  bali: drawBali,
  ericeira: drawEriceira,
  taghazout: drawTaghazout,
  nosara: drawNosara,
  jbay: drawJbay,
  hossegor: drawHossegor,
  puerto: drawPuerto,
  teahupoo: drawTeahupoo,
  snapper: drawSnapper,
  raglan: drawRaglan,
  cloudbreak: drawCloudbreak,
};

// Power-of-two on both axes (128x64, a clean 2:1 flag aspect) — a non-power-of-two canvas
// texture forces three.js into a mipmap-less fallback path that some WebGL1/software
// (SwiftShader) drivers render as fully blank; POT sidesteps that class of bug entirely.
export const FLAG_TEXTURE_WIDTH = 128;
export const FLAG_TEXTURE_HEIGHT = 64;

/** Runtime-only wrapper (not unit-tested, same pattern as `earthTexture.ts`'s
 * `createEarthTexture`): builds a real `<canvas>`, draws the destination's flag onto it via
 * the pure drawer above, and wraps it as a `CanvasTexture` for the flagpole mesh. */
export function createFlagTexture(destId: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = FLAG_TEXTURE_WIDTH;
  canvas.height = FLAG_TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d') as unknown as FlagCtx;
  const draw = FLAG_DRAWERS[destId] ?? FLAG_DRAWERS.oahu;
  draw(ctx, FLAG_TEXTURE_WIDTH, FLAG_TEXTURE_HEIGHT);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

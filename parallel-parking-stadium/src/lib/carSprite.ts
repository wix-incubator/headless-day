/* ============================================================
   Pixel cars, three projections, one shared palette. Each returns a list of
   {x,y,color} cells meant to be drawn as crisp 1×1 squares (SVG rects or canvas
   fillRects) and scaled nearest-neighbour. Front points +x (right).

     · carCells  — TOP-DOWN, rotatable. Used by the game + the hero gap diagram.
     · isoCells  — ¾ "hero portrait" (top+front+side). The hall-of-fame trophy.
     · sideCells — SIDE elevation (profile). The replay's "side view".

   Legend: hi lit edge/roof · body · lo shaded edge · roof cabin top
           glass windows · head headlight · tail taillight · dark tyre/void
   ============================================================ */

export type CarColors = {
  body: string;
  hi: string; // lit body edge / roof
  lo: string; // shaded body edge
  roof: string;
  glass: string; // dark windows
  head: string;
  tail: string;
  dark: string;
};

type Cell = { x: number; y: number; color: string };

/* ---- TOP-DOWN car (22×13, front = +x) --------------------------------------
   A clean bird's-eye car: a rounded capsule body with a lit top edge and shaded
   sill, ONE continuous dark greenhouse (rear window → lit roof panel → raked
   windshield) so the cabin reads as a single canopy instead of two "eyes", a
   hood sheen, corner head/taillights, wing mirrors and four tyres. Legible at
   any rotation, so the game and hero share it. */
export const GRID_W = 22;
export const GRID_H = 13;

export function carCells(c: CarColors): Cell[] {
  const out: Cell[] = [];
  const put = (x: number, y: number, role: keyof CarColors) => {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) out.push({ x, y, color: c[role] });
  };

  // tyres poke past the top/bottom edges (rear axle x5–7, front axle x14–16)
  for (const cx of [6, 15]) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      put(x, 0, 'dark'); put(x, 1, 'dark'); put(x, 11, 'dark'); put(x, 12, 'dark');
    }
  }

  // body: rounded capsule x2..20, top edge lit / bottom edge shaded, clipped corners
  for (let y = 2; y <= 10; y++) {
    for (let x = 2; x <= 20; x++) {
      if ((x <= 3 || x >= 19) && (y <= 2 || y >= 10)) continue; // clipped corners
      put(x, y, y === 2 ? 'hi' : y === 10 ? 'lo' : 'body');
    }
  }
  // rounded nose (front, right) + rear cap
  for (let y = 4; y <= 8; y++) put(21, y, 'body');
  put(21, 3, 'lo'); put(21, 9, 'lo');
  put(1, 5, 'lo'); put(1, 6, 'body'); put(1, 7, 'lo');

  // ONE continuous greenhouse canopy, inset so fenders show at y2-3 / y9-10.
  // dark glass from rear window through to the windshield; corners rounded.
  for (let y = 4; y <= 8; y++) {
    for (let x = 6; x <= 15; x++) {
      const roundedCorner = (y === 4 || y === 8) && (x === 6 || x === 15);
      if (roundedCorner) continue;
      put(x, y, 'glass');
    }
  }
  // lit roof panel sitting inside the canopy (center), with a sheen line
  for (let y = 5; y <= 7; y++) for (let x = 9; x <= 12; x++) put(x, y, 'roof');
  put(10, 6, 'hi'); put(11, 6, 'hi');
  // windshield glint at the front edge of the canopy
  put(15, 5, 'hi'); put(15, 7, 'hi');
  // hood sheen up front (between canopy and nose)
  for (let x = 17; x <= 19; x++) { put(x, 4, 'hi'); put(x, 5, 'hi'); }

  // wing mirrors just ahead of the windshield
  put(16, 2, 'lo'); put(16, 10, 'lo');
  // lights: heads at the nose, tails at the tail
  put(20, 3, 'head'); put(20, 9, 'head'); put(21, 4, 'head'); put(21, 8, 'head');
  put(2, 3, 'tail'); put(2, 9, 'tail');
  return out;
}

/* ---- ISO ¾ car (top + front + side) ----------------------------------------
   A hand-tuned box renderer drawn strictly back-to-front (painter's order) so
   faces never fight: chassis slab, wheels tucked into the fenders (drawn before
   the body so the arches occlude their tops), a set-back greenhouse with glass
   on the two visible faces, bumper, headlights. Top face lit, near side shaded,
   front mid — the chunky "hero portrait" look. Normalised to start at (0,0).
   +l runs to the lower-right (front), +w to the lower-left (near side), +h up. */
function buildIso(c: CarColors): Cell[] {
  const U = 3.0;
  const V = 3.0;
  const iso = (l: number, w: number, h: number): [number, number] => [
    (l - w) * U,
    (l + w) * (U / 2) - h * V,
  ];
  const raw: { x: number; y: number; role: keyof CarColors }[] = [];
  const fill = (pts: [number, number][], role: keyof CarColors) => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.round(minY); y <= Math.round(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) raw.push({ x, y, role });
      }
    }
  };
  // box: draws the near side (w1 face, lowest on screen), the front (l1 face),
  // then the top (h1 face) last so it caps the solid cleanly.
  const box = (
    l0: number, l1: number, w0: number, w1: number, h0: number, h1: number,
    top: keyof CarColors, front: keyof CarColors, side: keyof CarColors,
  ) => {
    fill([iso(l0, w1, h0), iso(l1, w1, h0), iso(l1, w1, h1), iso(l0, w1, h1)], side);
    fill([iso(l1, w0, h0), iso(l1, w1, h0), iso(l1, w1, h1), iso(l1, w0, h1)], front);
    fill([iso(l0, w0, h1), iso(l1, w0, h1), iso(l1, w1, h1), iso(l0, w1, h1)], top);
  };

  const L = 12;   // length (rear .. front)
  const Wd = 5.4; // width

  // wheels FIRST — near-side pair pokes below the fender; body drawn after tucks
  // them into the arches so they read as attached, not floating.
  for (const [a, b] of [[1.6, 3.4], [8.6, 10.4]]) {
    box(a, b, Wd - 0.7, Wd + 0.5, -0.2, 1.5, 'dark', 'dark', 'dark'); // near wheel
    box(a, b, -0.4, 0.4, -0.2, 1.4, 'dark', 'dark', 'dark');          // far wheel (peek)
  }

  // chassis: a lower sill (shaded) + a slightly inset upper body (lit top).
  box(0.4, 11.6, 0.2, Wd, 0.5, 1.6, 'lo', 'lo', 'lo');       // sill / rocker
  box(0.6, 11.4, 0.4, Wd - 0.2, 1.4, 2.9, 'hi', 'body', 'lo'); // main body

  // greenhouse — set back from both ends, glass on the two visible faces, lit roof
  box(3.4, 8.2, 0.7, Wd - 0.5, 2.7, 4.5, 'roof', 'glass', 'glass');
  // windshield / roof sheen sliver at the front of the cabin
  box(7.6, 8.2, 0.7, Wd - 0.5, 3.4, 4.5, 'hi', 'hi', 'glass');

  // front bumper + headlights on the nose (front face)
  box(11.4, 11.9, 0.7, Wd - 0.3, 0.7, 1.6, 'lo', 'lo', 'lo');       // bumper
  box(11.5, 11.9, 0.9, 1.9, 1.7, 2.5, 'head', 'head', 'head');      // headlight (far)
  box(11.5, 11.9, Wd - 1.7, Wd - 0.7, 1.7, 2.5, 'head', 'head', 'head'); // headlight (near)
  // small taillight on the rear near-side corner (the only rear face we can see)
  box(0.1, 0.5, Wd - 1.6, Wd - 0.4, 1.5, 2.3, 'tail', 'tail', 'tail');

  let minX = Infinity;
  let minY = Infinity;
  for (const p of raw) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
  return raw.map((p) => ({ x: p.x - minX, y: p.y - minY, color: c[p.role] }));
}

export function isoCells(c: CarColors): Cell[] {
  return buildIso(c);
}

// iso geometry is colour-independent, so its bounds are fixed — used to centre it
const _isoRef = buildIso({ body: '', hi: '', lo: '', roof: '', glass: '', head: '', tail: '', dark: '' });
export const ISO_W = Math.max(..._isoRef.map((p) => p.x)) + 1;
export const ISO_H = Math.max(..._isoRef.map((p) => p.y)) + 1;

/* ---- SIDE-ELEVATION car (28×16, profile, front = +x) -----------------------
   A clean profile: body slab with a lit beltline and shaded sill, a smooth
   greenhouse split by a B-pillar into two windows, a door seam, rounded
   hood/trunk, head/taillights and two wheels with hubcaps on the ground line.
   Used by the replay ("side view"). */
export const SIDE_W = 28;
export const SIDE_H = 16;

export function sideCells(c: CarColors): Cell[] {
  const out: Cell[] = [];
  const put = (x: number, y: number, role: keyof CarColors) => {
    if (x >= 0 && x < SIDE_W && y >= 0 && y < SIDE_H) out.push({ x, y, color: c[role] });
  };

  // body slab y8..12, with tapered top corners toward hood/trunk
  for (let y = 8; y <= 12; y++) {
    for (let x = 2; x <= 25; x++) {
      if ((x <= 3 || x >= 24) && y === 8) continue;
      put(x, y, y === 12 ? 'lo' : 'body');
    }
  }
  // rounded hood / trunk lips
  put(26, 9, 'body'); put(26, 10, 'body'); put(26, 11, 'lo');
  put(1, 9, 'body'); put(1, 10, 'body'); put(1, 11, 'lo');

  // greenhouse: a smooth roof line and two windows split by a B-pillar.
  // roof runs x9..19 at y4 (rear/front pillars in body colour, lit crown between)
  for (let x = 9; x <= 19; x++) put(x, 4, x <= 10 || x >= 18 ? 'body' : 'hi');
  // windows fill under the roof, raked at the ends so the cabin reads as glass
  const glassRows: [number, number, number][] = [
    [5, 11, 18],
    [6, 10, 19],
    [7, 10, 19],
  ];
  for (const [y, x0, x1] of glassRows) for (let x = x0; x <= x1; x++) put(x, y, 'glass');
  // A/C pillars + B-pillar (body-coloured struts through the glass)
  for (let y = 5; y <= 7; y++) { put(9, y, 'body'); put(14, y, 'body'); put(20, y, 'body'); }

  // beltline sheen + a subtle door seam
  for (let x = 4; x <= 23; x++) put(x, 8, 'hi');
  for (let y = 9; y <= 11; y++) put(14, y, 'lo');

  // lights
  put(26, 9, 'head'); put(26, 10, 'head'); put(1, 9, 'tail'); put(1, 10, 'tail');

  // wheels with a lit hubcap, sitting on the ground line
  for (const cx of [8, 20]) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      for (let y = 11; y <= 15; y++) {
        const dx = x - cx;
        const dy = y - 13;
        if (dx * dx + dy * dy * 1.15 <= 6.2) put(x, y, 'dark');
      }
    }
    put(cx, 13, 'hi'); // hubcap glint
  }
  return out;
}

// shared palettes (bright body, dark windows, lit roof patch)
export const CARS: Record<string, CarColors> = {
  red: { body: '#ef3e52', hi: '#ff8494', lo: '#b81f30', roof: '#c92739', glass: '#1a2138', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
  slate: { body: '#7889a3', hi: '#a3b0c6', lo: '#505b70', roof: '#5b6a83', glass: '#1a2138', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
  amber: { body: '#f1b53a', hi: '#ffd970', lo: '#bd8420', roof: '#d19a28', glass: '#1a2138', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
  teal: { body: '#2fa896', hi: '#63d6c2', lo: '#207065', roof: '#268b7c', glass: '#1a2138', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
  van: { body: '#eceadf', hi: '#ffffff', lo: '#bfbaa8', roof: '#d6d2c3', glass: '#1c2438', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
  blue: { body: '#3f86d6', hi: '#72abec', lo: '#2a5896', roof: '#3170bc', glass: '#1a2138', head: '#fff2c0', tail: '#ff5a5a', dark: '#14141c' },
};

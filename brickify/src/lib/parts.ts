// Shared brick catalog — used by the backend to seed Wix Stores products and
// to resolve a bill-of-materials into catalog line items. Kept in sync with the
// builder's client-side CATALOG/COLORS in src/pages/builder.astro.

export interface Colour { key: string; name: string; hex: string; }
export interface Part { id: string; name: string; fam: string; w: number; d: number; cat: string; }

function hx(n: number): string { return '#' + n.toString(16).padStart(6, '0').toUpperCase(); }

export const COLOURS: Colour[] = [
  ['white', 'White', 0xF2F3F2], ['black', 'Black', 0x1B1B1B], ['red', 'Red', 0xC4281B], ['darkRed', 'Dark Red', 0x720E0F],
  ['orange', 'Orange', 0xFE8A18], ['yellow', 'Yellow', 0xF5CD2F], ['tan', 'Tan', 0xE4CD9E], ['sand', 'Sand', 0xDCC48E],
  ['brown', 'Brown', 0x583927], ['reddishBrown', 'Reddish Brown', 0x5C3A29], ['cream', 'Cream', 0xF0E6CE],
  ['blue', 'Blue', 0x0055BF], ['darkBlue', 'Dark Blue', 0x1E3A5F], ['mediumBlue', 'Medium Blue', 0x5A93DB], ['glass', 'Trans-Blue', 0x9FC3E9],
  ['green', 'Green', 0x237841], ['darkGreen', 'Dark Green', 0x184632], ['lime', 'Lime', 0xA5CA18],
  ['gray', 'Light Gray', 0x9BA19D], ['lightGray', 'Light Bluish Gray', 0xA0A5A9], ['darkGray', 'Dark Bluish Gray', 0x555B5A],
  ['stoneGray', 'Stone Grey', 0x9DA3A1], ['stoneLight', 'Light Stone', 0xC7CAC5], ['roofGreen', 'Sand Green', 0x86AD8F], ['roofGreenDk', 'Dark Sand Green', 0x5E8A6C],
  ['amber', 'Amber', 0xE0A32E], ['purple', 'Purple', 0x81007B], ['magenta', 'Magenta', 0xC870A0],
].map(([key, name, hex]) => ({ key: key as string, name: name as string, hex: hx(hex as number) }));

export const COLOUR_BY_KEY: Record<string, Colour> = Object.fromEntries(COLOURS.map((c) => [c.key, c]));
export const COLOUR_BY_NAME: Record<string, Colour> = Object.fromEntries(COLOURS.map((c) => [c.name, c]));

export function priceOf(fam: string, w: number, d: number): number {
  const s = w * d;
  if (fam === 'brick') return +(0.05 + s * 0.022).toFixed(2);
  if (fam === 'plate') return +(0.03 + s * 0.014).toFixed(2);
  if (fam === 'tile') return +(0.04 + s * 0.02).toFixed(2);
  if (fam === 'slope' || fam === 'slopeinv') return +(0.10 + s * 0.02).toFixed(2);
  if (fam === 'cheese') return 0.06;
  if (fam === 'round' || fam === 'roundplate' || fam === 'roundtile') return +(0.09 + s * 0.02).toFixed(2);
  if (fam === 'cone' || fam === 'dome') return +(0.12 + s * 0.02).toFixed(2);
  if (fam === 'arch') return +(0.10 + w * 0.05).toFixed(2);
  return 0.2;
}

const RAW: [string, string, string, number, number, string][] = [
  // Bricks
  ['3005', 'Brick 1×1', 'brick', 1, 1, 'Bricks'], ['3004', 'Brick 1×2', 'brick', 1, 2, 'Bricks'], ['3622', 'Brick 1×3', 'brick', 1, 3, 'Bricks'],
  ['3010', 'Brick 1×4', 'brick', 1, 4, 'Bricks'], ['3009', 'Brick 1×6', 'brick', 1, 6, 'Bricks'], ['3008', 'Brick 1×8', 'brick', 1, 8, 'Bricks'],
  ['3003', 'Brick 2×2', 'brick', 2, 2, 'Bricks'], ['3002', 'Brick 2×3', 'brick', 2, 3, 'Bricks'], ['3001', 'Brick 2×4', 'brick', 2, 4, 'Bricks'],
  ['2456', 'Brick 2×6', 'brick', 2, 6, 'Bricks'], ['3007', 'Brick 2×8', 'brick', 2, 8, 'Bricks'], ['4201', 'Brick 1×10', 'brick', 1, 10, 'Bricks'],
  ['6112', 'Brick 1×12', 'brick', 1, 12, 'Bricks'], ['92538', 'Brick 2×10', 'brick', 2, 10, 'Bricks'], ['4202', 'Brick 2×12', 'brick', 2, 12, 'Bricks'],
  // Plates
  ['3024', 'Plate 1×1', 'plate', 1, 1, 'Plates'], ['3023', 'Plate 1×2', 'plate', 1, 2, 'Plates'], ['3623', 'Plate 1×3', 'plate', 1, 3, 'Plates'],
  ['3710', 'Plate 1×4', 'plate', 1, 4, 'Plates'], ['3666', 'Plate 1×6', 'plate', 1, 6, 'Plates'], ['3460', 'Plate 1×8', 'plate', 1, 8, 'Plates'],
  ['3022', 'Plate 2×2', 'plate', 2, 2, 'Plates'], ['3021', 'Plate 2×3', 'plate', 2, 3, 'Plates'], ['3020', 'Plate 2×4', 'plate', 2, 4, 'Plates'],
  ['3795', 'Plate 2×6', 'plate', 2, 6, 'Plates'], ['3034', 'Plate 2×8', 'plate', 2, 8, 'Plates'], ['3031', 'Plate 4×4', 'plate', 4, 4, 'Plates'], ['3032', 'Plate 4×6', 'plate', 4, 6, 'Plates'],
  ['3035', 'Plate 4×8', 'plate', 4, 8, 'Plates'], ['3958', 'Plate 6×6', 'plate', 6, 6, 'Plates'], ['41539', 'Plate 8×8', 'plate', 8, 8, 'Plates'],
  // Tiles
  ['3070', 'Tile 1×1', 'tile', 1, 1, 'Tiles'], ['3069', 'Tile 1×2', 'tile', 1, 2, 'Tiles'], ['63864', 'Tile 1×3', 'tile', 1, 3, 'Tiles'],
  ['2431', 'Tile 1×4', 'tile', 1, 4, 'Tiles'], ['6636', 'Tile 1×6', 'tile', 1, 6, 'Tiles'], ['4162', 'Tile 1×8', 'tile', 1, 8, 'Tiles'],
  ['3068', 'Tile 2×2', 'tile', 2, 2, 'Tiles'], ['87079', 'Tile 2×4', 'tile', 2, 4, 'Tiles'],
  // Slopes
  ['54200', 'Slope 30° 1×1', 'cheese', 1, 1, 'Slopes'], ['3040', 'Slope 45° 2×1', 'slope', 2, 1, 'Slopes'], ['3039', 'Slope 45° 2×2', 'slope', 2, 2, 'Slopes'],
  ['3038', 'Slope 45° 2×3', 'slope', 2, 3, 'Slopes'], ['4286', 'Slope 33° 3×1', 'slope', 3, 1, 'Slopes'], ['3298', 'Slope 33° 3×2', 'slope', 3, 2, 'Slopes'],
  ['3665', 'Slope Inv 45° 2×1', 'slopeinv', 2, 1, 'Slopes'], ['3660', 'Slope Inv 45° 2×2', 'slopeinv', 2, 2, 'Slopes'],
  ['3037', 'Slope 45° 2×4', 'slope', 2, 4, 'Slopes'], ['3036', 'Slope 45° 2×6', 'slope', 2, 6, 'Slopes'],
  // Round
  ['3062', 'Round Brick 1×1', 'round', 1, 1, 'Round'], ['6143', 'Round Brick 2×2', 'round', 2, 2, 'Round'],
  ['4073', 'Round Plate 1×1', 'roundplate', 1, 1, 'Round'], ['4032', 'Round Plate 2×2', 'roundplate', 2, 2, 'Round'],
  ['98138', 'Round Tile 1×1', 'roundtile', 1, 1, 'Round'], ['14769', 'Round Tile 2×2', 'roundtile', 2, 2, 'Round'],
  // Special
  ['4589', 'Cone 1×1', 'cone', 1, 1, 'Special'], ['3942', 'Cone 2×2', 'cone', 2, 2, 'Special'],
  ['553', 'Dome 2×2', 'dome', 2, 2, 'Special'], ['50747', 'Dome 1×1', 'dome', 1, 1, 'Special'],
  ['3455', 'Arch 1×4', 'arch', 4, 1, 'Special'], ['3307', 'Arch 1×6', 'arch', 6, 1, 'Special'],
  ['3771', 'Arch 1×8', 'arch', 8, 1, 'Special'], ['4490', 'Arch 1×3', 'arch', 3, 1, 'Special'],
  ['98283', 'Window 1×1', 'window', 1, 1, 'Special'], ['60623', 'Door 1×1', 'door', 1, 1, 'Special'],
];

export const PARTS: Part[] = RAW.map(([id, name, fam, w, d, cat]) => ({ id, name, fam, w, d, cat }));
export const PART_BY_ID: Record<string, Part> = Object.fromEntries(PARTS.map((p) => [p.id, p]));
export const PART_BY_NAME: Record<string, Part> = Object.fromEntries(PARTS.map((p) => [p.name, p]));

export const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';
export const COLOUR_OPTION_NAME = 'Colour';

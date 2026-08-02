import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sheetPath = path.join(root, "public/beads/bead-sheet.png");
const outDir = path.join(root, "public/beads");

/** 5×6 grid on 1024×1024 white sheet — last row has 3 centered beads */
const COLS = 5;
const ROWS = 6;

const BEADS = [
  { col: 0, row: 0, slug: "red", name: "Red" },
  { col: 1, row: 0, slug: "hot-pink", name: "Hot Pink" },
  { col: 2, row: 0, slug: "pink", name: "Pink" },
  { col: 3, row: 0, slug: "magenta", name: "Magenta" },
  { col: 4, row: 0, slug: "purple", name: "Purple" },
  { col: 0, row: 1, slug: "lavender", name: "Lavender" },
  { col: 1, row: 1, slug: "indigo", name: "Indigo" },
  { col: 2, row: 1, slug: "blue", name: "Blue" },
  { col: 3, row: 1, slug: "cyan", name: "Cyan" },
  { col: 4, row: 1, slug: "teal", name: "Teal" },
  { col: 0, row: 2, slug: "mint", name: "Mint" },
  { col: 1, row: 2, slug: "green", name: "Green" },
  { col: 2, row: 2, slug: "sage", name: "Sage" },
  { col: 3, row: 2, slug: "lime", name: "Lime" },
  { col: 4, row: 2, slug: "cream", name: "Cream" },
  { col: 0, row: 3, slug: "white", name: "White" },
  { col: 1, row: 3, slug: "ivory", name: "Ivory" },
  { col: 2, row: 3, slug: "beige", name: "Beige" },
  { col: 3, row: 3, slug: "silver", name: "Silver" },
  { col: 4, row: 3, slug: "gold", name: "Gold" },
  { col: 0, row: 4, slug: "orange", name: "Orange" },
  { col: 1, row: 4, slug: "yellow", name: "Yellow" },
  { col: 2, row: 4, slug: "mustard", name: "Mustard" },
  { col: 3, row: 4, slug: "tan", name: "Tan" },
  { col: 4, row: 4, slug: "brown", name: "Brown" },
  { col: 1, row: 5, slug: "chocolate", name: "Chocolate" },
  { col: 2, row: 5, slug: "grey", name: "Grey" },
  { col: 3, row: 5, slug: "black", name: "Black" },
];

function keyWhiteTransparent(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 248 && g > 248 && b > 248) data[i + 3] = 0;
  }
}

const meta = await sharp(sheetPath).metadata();
const cellW = meta.width / COLS;
const cellH = meta.height / ROWS;
const insetX = Math.floor(cellW * 0.08);
const cropW = Math.floor(cellW) - 2 * insetX;
const topPad = Math.floor(cellH * 0.03);
const shadowBleed = Math.floor(cellH * 0.18);

await mkdir(outDir, { recursive: true });

for (const bead of BEADS) {
  const left = Math.floor(bead.col * cellW) + insetX;
  const top = Math.floor(bead.row * cellH) + topPad;
  let height = Math.floor(cellH) - topPad;
  if (bead.row < ROWS - 1) height += shadowBleed;
  height = Math.min(height, meta.height - top);
  const outPath = path.join(outDir, `${bead.slug}.png`);

  const { data, info } = await sharp(sheetPath)
    .extract({ left, top, width: cropW, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  keyWhiteTransparent(data);

  await sharp(data, { raw: info })
    .trim({ threshold: 10 })
    .resize(96, 96, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 6,
      bottom: 18,
      left: 16,
      right: 16,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);

  console.log(`Wrote ${bead.slug}.png (${bead.name})`);
}

console.log(`Done — ${BEADS.length} beads from ${COLS}×${ROWS} grid`);

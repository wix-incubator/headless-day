import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sheetPath = path.join(root, "public/beads/bead-sheet.png");
const outDir = path.join(root, "public/beads");

/** 6×4 grid — 1536×1024 sheet */
const COLS = 6;
const ROWS = 4;

const BEADS = [
  // row 0
  { col: 0, row: 0, slug: "red", name: "Red" },
  { col: 1, row: 0, slug: "hot-pink", name: "Hot Pink" },
  { col: 2, row: 0, slug: "pink", name: "Pink" },
  { col: 3, row: 0, slug: "magenta", name: "Magenta" },
  { col: 4, row: 0, slug: "purple", name: "Purple" },
  { col: 5, row: 0, slug: "blue", name: "Blue" },
  // row 1
  { col: 0, row: 1, slug: "mint", name: "Mint" },
  { col: 1, row: 1, slug: "green", name: "Green" },
  { col: 2, row: 1, slug: "sage", name: "Sage" },
  { col: 3, row: 1, slug: "lavender", name: "Lavender" },
  { col: 4, row: 1, slug: "lime", name: "Lime" },
  { col: 5, row: 1, slug: "teal", name: "Teal" },
  // row 2
  { col: 0, row: 2, slug: "yellow", name: "Yellow" },
  { col: 1, row: 2, slug: "mustard", name: "Mustard" },
  { col: 2, row: 2, slug: "tan", name: "Tan" },
  { col: 3, row: 2, slug: "cream", name: "Cream" },
  { col: 4, row: 2, slug: "white", name: "White" },
  { col: 5, row: 2, slug: "pearl", name: "Pearl" },
  // row 3 — skip duplicate yellow/mustard in cols 0–1
  { col: 2, row: 3, slug: "chocolate", name: "Chocolate" },
  { col: 3, row: 3, slug: "silver", name: "Silver" },
  { col: 4, row: 3, slug: "gold", name: "Gold" },
  { col: 5, row: 3, slug: "black", name: "Black" },
];

const meta = await sharp(sheetPath).metadata();
const cellW = Math.floor(meta.width / COLS);
const cellH = Math.floor(meta.height / ROWS);

await mkdir(outDir, { recursive: true });

for (const bead of BEADS) {
  const left = bead.col * cellW;
  const top = bead.row * cellH;
  const beadH = Math.floor(cellH * 0.72);
  const outPath = path.join(outDir, `${bead.slug}.png`);
  await sharp(sheetPath)
    .extract({ left, top, width: cellW, height: beadH })
    .png()
    .toFile(outPath);
  console.log(`Wrote ${bead.slug}.png (${bead.name})`);
}

console.log(`Done — ${BEADS.length} beads from ${cellW}×${cellH} cells`);

/**
 * Fetch a real 30-second preview clip for each record in the listening rooms
 * from the free iTunes Search API (no key), and bake them into
 * `src/data/previews.json`. Keeps the app a static site — audio streams from
 * Apple's CDN at runtime.
 *
 * Run once (and after adding records):  node scripts/fetch-previews.mjs
 */
import { writeFile } from "node:fs/promises";

// Every record played across the rooms (keep in sync with src/data/rooms.ts).
const RECORDS = [
  "Miles Davis — Kind of Blue",
  "John Coltrane — Blue Train",
  "Bill Evans Trio — Waltz for Debby",
  "Chet Baker — Sings",
  "Radiohead — In Rainbows",
  "Thom Yorke — The Eraser",
  "Radiohead — Amnesiac",
  "Nas — Illmatic",
  "A Tribe Called Quest — Midnight Marauders",
  "Wu-Tang Clan — Enter the Wu-Tang",
  "J Dilla — Donuts",
  "Brian Eno — Music for Airports",
  "Hiroshi Yoshimura — Green",
  "Gigi Masin — Wind",
  "Mariya Takeuchi — Variety",
  "Tatsuro Yamashita — For You",
  "Anri — Timely!!",
  "Taeko Ohnuki — Sunshower",
  "Marvin Gaye — What's Going On",
  "Aretha Franklin — I Never Loved a Man",
  "The Temptations — Cloud Nine",
  "Curtis Mayfield — Curtis",
  "Kraftwerk — Trans-Europe Express",
  "Kraftwerk — The Man-Machine",
  "Neu! — Neu! 75",
  "Fleetwood Mac — Rumours",
  "Joni Mitchell — Blue",
  "Neil Young — Harvest",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(record) {
  const [artist, album] = record.split(" — ");
  const term = encodeURIComponent(`${artist} ${album ?? ""}`.trim());
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=5`;
  const res = await fetch(url, { headers: { "User-Agent": "vinyl-rooms/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Prefer a result that actually has a preview URL.
  const hit = (data.results ?? []).find((r) => r.previewUrl) ?? data.results?.[0];
  if (!hit?.previewUrl) return null;
  return {
    track: hit.trackName,
    artist: hit.artistName,
    previewUrl: hit.previewUrl,
    artwork: (hit.artworkUrl100 || "").replace("100x100", "300x300"),
  };
}

const out = {};
let ok = 0;
for (const record of RECORDS) {
  try {
    const info = await lookup(record);
    if (info) {
      out[record] = info;
      ok++;
      console.log(`  ✓ ${record}  →  ${info.artist} — ${info.track}`);
    } else {
      console.log(`  · ${record}  (no preview)`);
    }
  } catch (e) {
    console.log(`  ✗ ${record} — ${e.message}`);
  }
  await sleep(350); // be gentle with the API
}

const path = new URL("../src/data/previews.json", import.meta.url);
await writeFile(path, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${ok}/${RECORDS.length} previews → src/data/previews.json`);

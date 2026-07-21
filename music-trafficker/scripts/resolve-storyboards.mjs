#!/usr/bin/env node
// Resolves YouTube storyboard sprite-sheet URLs for every video of the
// channel and writes them to src/server/storyboard-snapshot.json.
//
// Why: watch pages are bot-gated from datacenter IPs (the deployed server
// gets a captcha stub), so the runtime falls back to this snapshot, resolved
// from a residential machine at build time. Run before deploying:
//   node scripts/resolve-storyboards.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CHANNEL_HANDLE = "MusicTrafficker";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "Accept-Language": "en",
  Cookie: "CONSENT=YES+; SOCS=CAI",
};

async function listVideoIds() {
  const res = await fetch(`https://www.youtube.com/@${CHANNEL_HANDLE}/videos`, {
    headers: HEADERS,
  });
  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match) throw new Error("ytInitialData not found on channel page");
  const data = JSON.parse(match[1]);
  const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
  const selected = tabs.find((t) => t.tabRenderer?.selected);
  const items = selected.tabRenderer.content.richGridRenderer.contents;
  return items
    .map((it) => it.richItemRenderer?.content?.lockupViewModel?.contentId)
    .filter(Boolean);
}

async function resolveSpec(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: HEADERS,
  });
  const html = await res.text();
  const match = html.match(/"playerStoryboardSpecRenderer":\{"spec":"([^"]+)"/);
  if (!match) return null;
  const spec = match[1].replace(/\\u0026/g, "&");
  const levels = spec.split("|");
  const base = levels.shift();
  if (!base || levels.length === 0) return null;
  let levelIdx = levels.findIndex((l) => l.startsWith("160#"));
  if (levelIdx === -1) levelIdx = levels.length - 1;
  const [, , count, cols, rows, intervalMs, name, sigh] =
    levels[levelIdx].split("#");
  if (!sigh) return null;
  return {
    sheetUrl:
      base.replace("$L", String(levelIdx)).replace("$N", name.replace("$M", "0")) +
      "&sigh=" +
      sigh,
    meta: {
      cols: +cols,
      rows: +rows,
      frames: Math.min(+cols * +rows, +count),
      intervalMs: +intervalMs,
    },
  };
}

const ids = await listVideoIds();
console.log(`channel videos: ${ids.length}`);
const snapshot = {};
for (const id of ids) {
  try {
    const entry = await resolveSpec(id);
    if (entry) {
      snapshot[id] = entry;
      console.log(`ok   ${id}`);
    } else {
      console.log(`none ${id}`);
    }
  } catch (e) {
    console.log(`fail ${id}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/server/storyboard-snapshot.json",
);
writeFileSync(out, JSON.stringify(snapshot, null, 1));
console.log(`wrote ${Object.keys(snapshot).length} entries to ${out}`);

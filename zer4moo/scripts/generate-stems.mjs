import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const H = { Authorization: `Bearer ${TOKEN}`, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' };

const SUFFIX = ', soft flat editorial illustration in a calm whimsical storybook meadow style, muted cream and sage-green palette, simple flat shapes with subtle paper texture and minimal gentle detail, the whole plant centered with the stem base at the very bottom center of the frame, isolated on a plain solid pure white background, no cast shadow, no pot, no vase, no ground line, no text, no watermark, no border, no frame';
const PROMPTS = {
  timothy: 'a single golden Timothy hay grass stalk with a soft fuzzy cattail-like seed head on a long thin green stem',
  wheat: 'a single golden wheat stalk with plump grains and long fine awns on a thin stem',
  ryegrass: 'a small graceful cluster of fresh green ryegrass blades',
  alfalfa: 'a single alfalfa sprig with small green leaves and a few tiny purple flowers on a stem',
  clover: 'a single round pink-and-mauve clover flower with a green trefoil leaf on a stem',
  dandelion: 'a single bright cheerful yellow dandelion flower on a slender green stem',
  buttercup: 'a single golden buttercup flower with five rounded glossy petals on a thin stem',
  daisy: 'a single white meadow daisy with a golden center and soft grey-shaded petals on a green stem',
  poppy: 'a single soft coral-pink field poppy with crinkled petals and a dark center on a stem',
  blush: 'a single blush-pink cosmos wildflower with soft rounded petals and a small golden center on a stem',
  harebell: 'a single pale periwinkle-blue harebell bellflower nodding on a thin arched green stem',
  lavender: 'a single lavender flower spike with small soft lilac-purple buds on a green stem',
};

async function generate(prompt) {
  const res = await fetch('https://www.wixapis.com/runwareschemaless/v1/request', {
    method: 'POST', headers: H,
    body: JSON.stringify([{ taskType: 'imageInference', taskUUID: randomUUID(), outputType: 'URL', outputFormat: 'PNG', positivePrompt: prompt, width: 1024, height: 1024, model: 'google:4@2', numberResults: 1 }]),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${t.slice(0, 200)}`);
  const url = (JSON.parse(t).data || []).find((x) => x && x.imageURL)?.imageURL;
  if (!url) throw new Error('no imageURL');
  return url;
}

// Remove the white background by flood-filling from the edges (preserves interior whites),
// then autocrop to the content bounding box.
function cutout(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H2, data } = png;
  const T = 232; // near-white threshold
  const isWhite = (i) => data[i] >= T && data[i + 1] >= T && data[i + 2] >= T;
  const visited = new Uint8Array(W * H2);
  const stack = [];
  const pushEdge = (x, y) => { const p = y * W + x; if (!visited[p]) { visited[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { pushEdge(x, 0); pushEdge(x, H2 - 1); }
  for (let y = 0; y < H2; y++) { pushEdge(0, y); pushEdge(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    if (!isWhite(i)) continue;
    data[i + 3] = 0; // transparent
    const x = p % W, y = (p / W) | 0;
    if (x > 0) pushEdge(x - 1, y);
    if (x < W - 1) pushEdge(x + 1, y);
    if (y > 0) pushEdge(x, y - 1);
    if (y < H2 - 1) pushEdge(x, y + 1);
  }
  // soften 1px halos: fade pixels that are light and touch transparency
  // (cheap pass) + compute bbox
  let minX = W, minY = H2, maxX = 0, maxY = 0;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
    const a = data[(y * W + x) * 4 + 3];
    if (a > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H2 - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * W + (x + minX)) * 4;
    const di = (y * cw + x) * 4;
    out.data[di] = data[si]; out.data[di + 1] = data[si + 1]; out.data[di + 2] = data[si + 2]; out.data[di + 3] = data[si + 3];
  }
  return { buf: PNG.sync.write(out), w: cw, h: ch };
}

async function main() {
  const ids = process.argv.slice(2);
  const list = ids.length ? ids : Object.keys(PROMPTS);
  for (const id of list) {
    if (!PROMPTS[id]) { console.log('unknown', id); continue; }
    try {
      console.log(`Generating ${id}...`);
      const url = await generate(PROMPTS[id] + SUFFIX);
      const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
      const { buf, w, h } = cutout(raw);
      writeFileSync(`public/stems/${id}.png`, buf);
      console.log(`  ✓ ${id} → public/stems/${id}.png (${w}×${h}, ${(buf.length / 1024) | 0}kb)`);
    } catch (e) { console.error(`  ✗ ${id}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 1200));
  }
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

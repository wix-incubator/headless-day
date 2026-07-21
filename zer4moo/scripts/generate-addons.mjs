import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const H = { Authorization: `Bearer ${TOKEN}`, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' };
mkdirSync('public/addons', { recursive: true });

const SUFFIX = ', soft flat editorial illustration in a calm whimsical storybook style, muted cream and sage-green palette with warm accents, simple flat shapes with subtle paper texture and gentle detail, the single object centered, isolated on a plain solid pure white background, no cast shadow, no text, no watermark, no border, no frame';
const ADDONS = {
  'salt-lick': 'a rectangular pale pink Himalayan rock salt lick block',
  'carrot': 'a single fresh orange carrot with a leafy green top',
  'dandelion-garnish': 'a small delicate sprig of green dandelion leaves with one tiny yellow dandelion bloom',
  'bell-wrap': 'a small golden bell tied with a blush-pink ribbon bow',
  'apple-confetti': 'a few thin fresh apple slices scattered together',
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
function cutout(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H2, data } = png;
  const T = 232;
  const isWhite = (i) => data[i] >= T && data[i + 1] >= T && data[i + 2] >= T;
  const visited = new Uint8Array(W * H2);
  const stack = [];
  const push = (x, y) => { const p = y * W + x; if (!visited[p]) { visited[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H2 - 1); }
  for (let y = 0; y < H2; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const p = stack.pop(); const i = p * 4;
    if (!isWhite(i)) continue;
    data[i + 3] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1); if (y < H2 - 1) push(x, y + 1);
  }
  let minX = W, minY = H2, maxX = 0, maxY = 0;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H2 - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * W + (x + minX)) * 4, di = (y * cw + x) * 4;
    out.data[di] = data[si]; out.data[di + 1] = data[si + 1]; out.data[di + 2] = data[si + 2]; out.data[di + 3] = data[si + 3];
  }
  return { buf: PNG.sync.write(out), w: cw, h: ch };
}

async function main() {
  for (const [slug, desc] of Object.entries(ADDONS)) {
    try {
      console.log(`Generating ${slug}...`);
      const url = await generate(desc + SUFFIX);
      const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
      const { buf, w, h } = cutout(raw);
      writeFileSync(`public/addons/${slug}.png`, buf);
      console.log(`  ✓ ${slug} (${w}×${h}, ${(buf.length / 1024) | 0}kb)`);
    } catch (e) { console.error(`  ✗ ${slug}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 1200));
  }
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

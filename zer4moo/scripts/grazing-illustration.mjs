import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const BASE = 'https://www.wixapis.com';
const H = { Authorization: `Bearer ${TOKEN}`, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' };

async function post(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  return json;
}

const prompt =
  'Soft flat editorial illustration of a few cute, friendly cows grazing peacefully in a wide field of tall grass and delicate wildflowers, gentle rolling pasture and a soft distant treeline, warm cream and sage-green palette with pale blush accents, gentle golden-hour light, elegant boutique storybook style, calm and whimsical-but-refined, generous negative space, flat shapes with subtle texture, no text, no watermarks';

async function main() {
  const gen = await post('/runwareschemaless/v1/request', [{
    taskType: 'imageInference', taskUUID: randomUUID(), outputType: 'URL',
    outputFormat: 'PNG', positivePrompt: prompt, width: 1376, height: 768, model: 'google:4@2', numberResults: 1,
  }]);
  const arr = gen.data || (Array.isArray(gen) ? gen : []);
  const temp = arr.find((x) => x && x.imageURL)?.imageURL;
  if (!temp) throw new Error('no imageURL: ' + JSON.stringify(gen).slice(0, 200));

  const imp = await post('/site-media/v1/files/import', {
    url: temp, mimeType: 'image/png', displayName: 'cows-grazing-illustration.png',
  });
  const url = (imp.file || imp).url;
  if (!url) throw new Error('no file.url');

  // Patch only the GRAZING line in generatedMedia.ts; keep BOUQUET_IMAGES intact.
  const path = 'src/lib/generatedMedia.ts';
  let src = readFileSync(path, 'utf8');
  src = src.replace(/export const GRAZING = ".*?";/, `export const GRAZING = ${JSON.stringify(url)};`);
  writeFileSync(path, src);
  console.log('✓ grazing illustration:', url);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

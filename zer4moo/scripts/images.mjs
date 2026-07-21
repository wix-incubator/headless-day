import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const BASE = 'https://www.wixapis.com';
const H = {
  Authorization: `Bearer ${TOKEN}`,
  'wix-site-id': SITE_ID,
  'Content-Type': 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 400)}`);
  return json;
}

// Generate one image → return temp imageURL (sequential; no batching, per media-pipeline note)
async function generate(prompt, width, height) {
  const body = [{
    taskType: 'imageInference', taskUUID: randomUUID(), outputType: 'URL',
    outputFormat: 'PNG', positivePrompt: prompt, width, height,
    model: 'google:4@2', numberResults: 1,
  }];
  const json = await post('/runwareschemaless/v1/request', body);
  const arr = json.data || json.results || (Array.isArray(json) ? json : []);
  const hit = arr.find((x) => x && (x.imageURL || x.imageUrl));
  const url = hit?.imageURL || hit?.imageUrl;
  if (!url) throw new Error('no imageURL in response: ' + JSON.stringify(json).slice(0, 300));
  return url;
}

async function importMedia(tempUrl, displayName) {
  const json = await post('/site-media/v1/files/import', {
    url: tempUrl, mimeType: 'image/png', displayName,
  });
  const f = json.file || json;
  if (!f.url) throw new Error('no file.url in import response: ' + JSON.stringify(json).slice(0, 300));
  return { url: f.url, id: f.id };
}

// read-merge-PUT: attach portrait onto a cow CMS item
async function attachPortrait(itemId, fileUrl) {
  const q = await post('/wix-data/v2/items/query', { dataCollectionId: 'Cows', filter: { _id: itemId } });
  const item = (q.dataItems || [])[0];
  if (!item) throw new Error('cow item not found: ' + itemId);
  const merged = { ...item.data, portrait: fileUrl };
  const res = await fetch(`${BASE}/wix-data/v2/items/${itemId}`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ dataCollectionId: 'Cows', dataItem: { data: merged } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PUT ${res.status}: ${text.slice(0, 300)}`);
}

const seeded = JSON.parse(readFileSync('/tmp/seeded.json', 'utf8'));
const media = existsSync('/tmp/media.json') ? JSON.parse(readFileSync('/tmp/media.json', 'utf8')) : { cows: {} };
media.cows = media.cows || {};

// Per-cow photoreal prompts (portraitNote drives distinctness)
const PHOTO_STYLE = 'warm high-key photographic portrait, gentle natural daylight, soft green pasture bokeh background, shallow depth of field, muted cream-and-sage color grade, gentle and characterful, editorial gifting-catalog quality, no text, no watermarks';
const cowPrompts = {
  clementine: `A friendly Jersey cow, doe-eyed with long lashes and a single white daisy tucked behind one ear, soft tan coat, tender romantic expression, ${PHOTO_STYLE}`,
  'sir-reginald': `A distinguished shaggy Highland cow with a long rust-orange fringe over a noble brow, dignified almost aristocratic expression, ${PHOTO_STYLE}`,
  buttercup: `A classic black-and-white Holstein cow with a permanently delighted, joyful expression, bright happy eyes, ${PHOTO_STYLE}`,
  maisie: `A gentle Guernsey cow with a soft fawn-and-cream coat and calm gentle eyes, mid slow-blink giving a serene approving look, ${PHOTO_STYLE}`,
  duchess: `An elegant Brown Swiss cow with a silvery grey-brown coat and a long graceful neck, regal poised expression like a framed portrait, ${PHOTO_STYLE}`,
  pip: `A tiny miniature Dexter cow with a glossy jet-black coat and lively perky ears, exuberant playful expression, ${PHOTO_STYLE}`,
  willa: `A Belted Galloway cow, black coat with a wide white belt around the middle, soft sentimental tender expression, ${PHOTO_STYLE}`,
  'colonel-mustard': `An elder Hereford cow with a deep red coat and a white face, weathered dignified stoic expression, ${PHOTO_STYLE}`,
};

async function main() {
  const failures = [];

  // 1) Cow portraits (photoreal, square) — sequential
  for (const cow of seeded.Cows) {
    if (media.cows[cow.slug]) { console.log(`skip ${cow.slug} (already have url)`); continue; }
    const prompt = cowPrompts[cow.slug];
    try {
      console.log(`Generating portrait: ${cow.slug}...`);
      const temp = await generate(prompt, 1024, 1024);
      const { url } = await importMedia(temp, `cow-${cow.slug}.png`);
      await attachPortrait(cow._id, url);
      media.cows[cow.slug] = url;
      writeFileSync('/tmp/media.json', JSON.stringify(media, null, 2));
      console.log(`  ✓ ${cow.slug} attached`);
    } catch (e) {
      console.error(`  ✗ ${cow.slug}: ${e.message}`);
      failures.push(cow.slug);
    }
    await sleep(1500);
  }

  // 2) Hero bouquet (soft flat illustration register, editorial 4:3)
  if (!media.hero) {
    try {
      console.log('Generating hero bouquet illustration...');
      const heroPrompt = 'Soft flat editorial illustration of a hand-tied bouquet of golden hay and delicate wildflowers, clover and dandelion, bound with a pale blush linen ribbon, resting on pale cream linen fabric, warm cream and sage-green palette, gentle golden-hour light, elegant boutique-florist style, generous negative space, minimal and refined, no text, no watermarks';
      const temp = await generate(heroPrompt, 1200, 896);
      const { url } = await importMedia(temp, 'hero-bouquet.png');
      media.hero = url;
      writeFileSync('/tmp/media.json', JSON.stringify(media, null, 2));
      console.log('  ✓ hero attached');
    } catch (e) {
      console.error(`  ✗ hero: ${e.message}`);
      failures.push('hero');
    }
  }

  console.log('\n=== DONE ===');
  console.log('Cows with portraits:', Object.keys(media.cows).length, '/ 8');
  console.log('Hero:', media.hero ? 'yes' : 'no');
  if (failures.length) console.log('Failures (will use themed-block fallback):', failures.join(', '));
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

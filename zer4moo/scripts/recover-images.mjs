import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const BASE = 'https://www.wixapis.com';
const H = { Authorization: `Bearer ${TOKEN}`, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' };

async function req(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${method} ${path}: ${text.slice(0, 300)}`);
  return json;
}

async function main() {
  // 1) build displayName -> url from media library
  const list = await req('GET', '/site-media/v1/files?paging.limit=100');
  const byName = {};
  for (const f of (list.files || [])) byName[f.displayName] = f.url;

  const media = { hero: byName['hero-bouquet.png'] || '', cows: {} };

  // 2) query ALL cows (no filter), map by _id
  const q = await req('POST', '/wix-data/v2/items/query', { dataCollectionId: 'Cows' });
  const cows = (q.dataItems || []).map((d) => d.data);

  // 3) attach each portrait via read-merge-PUT (data._id must match URL id)
  for (const cow of cows) {
    const fname = `cow-${cow.slug}.png`;
    const url = byName[fname];
    if (!url) { console.log(`no media for ${cow.slug}`); continue; }
    const merged = { ...cow, portrait: url }; // cow already includes _id
    await req('PUT', `/wix-data/v2/items/${cow._id}`, {
      dataCollectionId: 'Cows', dataItem: { data: merged },
    });
    media.cows[cow.slug] = url;
    console.log(`✓ ${cow.slug} -> ${url.slice(-30)}`);
  }

  // 4) verify persistence
  const check = await req('POST', '/wix-data/v2/items/query', { dataCollectionId: 'Cows' });
  const withPortrait = (check.dataItems || []).filter((d) => d.data.portrait).length;
  console.log(`\nCows with portrait persisted: ${withPortrait} / ${(check.dataItems || []).length}`);

  writeFileSync('/tmp/media.json', JSON.stringify(media, null, 2));
  console.log('hero:', media.hero.slice(-30));
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });

/**
 * Seed the Wix CMS collections with the local content in src/data/content.ts.
 *
 * Uses the Wix Data REST API with a Wix API key (server-to-server admin auth),
 * so it can write to admin-managed collections. Run AFTER you've created the
 * collections (see README → "CMS collections").
 *
 *   WIX_API_KEY=...  WIX_SITE_ID=...  npm run seed
 *
 *   WIX_API_KEY  — Dashboard → Settings → API Keys (needs "Wix Data" permission)
 *   WIX_SITE_ID  — Dashboard → Settings → Headless Settings (the site/metasite id)
 *
 * Idempotency: pass `--truncate` to clear each collection before inserting.
 */
import { DISHES, REVIEWS, STORY, TODAYS_CATCH } from '../src/data/content.ts';

const API_KEY = process.env.WIX_API_KEY;
const SITE_ID = process.env.WIX_SITE_ID;
const TRUNCATE = process.argv.includes('--truncate');
const BASE = 'https://www.wixapis.com/wix-data/v2';

if (!API_KEY || !SITE_ID) {
  console.error('Missing env. Set WIX_API_KEY and WIX_SITE_ID. See script header.');
  process.exit(1);
}

const headers = {
  Authorization: API_KEY,
  'wix-site-id': SITE_ID,
  'Content-Type': 'application/json',
};

async function api(path, method, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function truncate(collectionId) {
  // Query all, then bulk-remove. Small collections, so one page is plenty.
  const { dataItems = [] } = await api('/items/query', 'POST', {
    dataCollectionId: collectionId,
    query: { paging: { limit: 1000 } },
  });
  for (const it of dataItems) {
    await api(`/items/${it.dataItem.id}?dataCollectionId=${collectionId}`, 'DELETE');
  }
  if (dataItems.length) console.log(`  cleared ${dataItems.length} from ${collectionId}`);
}

async function insert(collectionId, data) {
  await api('/items', 'POST', { dataCollectionId: collectionId, dataItem: { data } });
}

async function seedCollection(collectionId, rows) {
  if (TRUNCATE) await truncate(collectionId);
  for (const row of rows) {
    // strip our local _id; Wix assigns its own
    const { _id, ...data } = row;
    await insert(collectionId, data);
  }
  console.log(`✓ ${collectionId}: ${rows.length} item(s)`);
}

async function main() {
  console.log(`Seeding site ${SITE_ID}${TRUNCATE ? ' (truncating first)' : ''}…`);
  await seedCollection('BoardDish', DISHES);
  await seedCollection('Review', REVIEWS);
  await seedCollection('StoryBlock', [STORY]);
  await seedCollection('TodaysCatch', [TODAYS_CATCH]);
  console.log('Done. Reload the site to see live CMS content.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});

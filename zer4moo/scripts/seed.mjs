import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = process.env.WIX_SITE_ID || 'YOUR_SITE_ID';
const BASE = 'https://www.wixapis.com';

const H = {
  Authorization: `Bearer ${TOKEN}`,
  'wix-site-id': SITE_ID,
  'Content-Type': 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, body, { retry = true } = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: H,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    // provisioning races self-heal: 403 on create, 400 WDE0117 on insert, 5xx
    const transient = res.status === 403 || res.status >= 500 ||
      (res.status === 400 && text.includes('WDE0117'));
    if (retry && transient) {
      console.error(`  transient ${res.status} on ${path} — retrying once in 4s`);
      await sleep(4000);
      return call(path, body, { retry: false });
    }
    throw new Error(`${res.status} ${path}\n${text}`);
  }
  return json;
}

// ---------- Collection schemas ----------
const PERMS = { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ANYONE' };

const collections = [
  {
    id: 'Cows', displayName: 'The Herd',
    fields: [
      { key: 'name', displayName: 'Name', type: 'TEXT' },
      { key: 'slug', displayName: 'Slug', type: 'TEXT' },
      { key: 'breed', displayName: 'Breed', type: 'TEXT' },
      { key: 'age', displayName: 'Age', type: 'NUMBER' },
      { key: 'bio', displayName: 'Bio', type: 'TEXT' },
      { key: 'favoriteGreens', displayName: 'Favorite Greens', type: 'ARRAY_STRING' },
      { key: 'mood', displayName: 'Mood', type: 'TEXT' },
      { key: 'ribbonColor', displayName: 'Ribbon Color', type: 'TEXT' },
      { key: 'portraitNote', displayName: 'Portrait Note', type: 'TEXT' },
      { key: 'portrait', displayName: 'Portrait', type: 'IMAGE' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
      { key: 'featured', displayName: 'Featured', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'Bouquets', displayName: 'Bouquets',
    fields: [
      { key: 'name', displayName: 'Name', type: 'TEXT' },
      { key: 'slug', displayName: 'Slug', type: 'TEXT' },
      { key: 'category', displayName: 'Category', type: 'TEXT' },
      { key: 'basePrice', displayName: 'Base Price', type: 'NUMBER' },
      { key: 'originalPrice', displayName: 'Original Price', type: 'NUMBER' },
      { key: 'description', displayName: 'Description', type: 'TEXT' },
      { key: 'tags', displayName: 'Tags', type: 'ARRAY_STRING' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
      { key: 'featured', displayName: 'Featured', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'AddOns', displayName: 'Add-Ons',
    fields: [
      { key: 'name', displayName: 'Name', type: 'TEXT' },
      { key: 'price', displayName: 'Price', type: 'NUMBER' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
    ],
  },
  {
    id: 'StoryBlocks', displayName: 'Story Blocks',
    fields: [
      { key: 'heading', displayName: 'Heading', type: 'TEXT' },
      { key: 'body', displayName: 'Body', type: 'TEXT' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
    ],
  },
  {
    id: 'Testimonials', displayName: 'Testimonials',
    fields: [
      { key: 'name', displayName: 'Name', type: 'TEXT' },
      { key: 'quote', displayName: 'Quote', type: 'TEXT' },
      { key: 'detail', displayName: 'Detail', type: 'TEXT' },
      { key: 'order', displayName: 'Order', type: 'NUMBER' },
    ],
  },
];

// ---------- Content ----------
const cows = [
  { name: 'Clementine', slug: 'clementine', breed: 'Jersey', age: 4,
    bio: 'The romantic of the herd. Believes every meal is a special occasion and will pause dramatically before the first bite as if posing for a portrait. Prefers her bouquets soft, floral, and a little bit extra.',
    favoriteGreens: ['wildflowers', 'clover', 'dandelion'], mood: 'dramatic', ribbonColor: 'blush',
    portraitNote: 'doe-eyed, long lashes, a single daisy behind the ear', order: 1, featured: true },
  { name: 'Sir Reginald Chews-a-Lot', slug: 'sir-reginald', breed: 'Highland', age: 7,
    bio: 'Distinguished and shaggy, with strong opinions about hay provenance. Will accept only the finest first-cut timothy and has been known to return an arrangement he finds "pedestrian."',
    favoriteGreens: ['premium timothy', 'dandelion'], mood: 'content', ribbonColor: 'forest green',
    portraitNote: 'rust-orange fringe, noble brow, monocle energy', order: 2, featured: true },
  { name: 'Buttercup', slug: 'buttercup', breed: 'Holstein', age: 2,
    bio: 'The pure enthusiast. Every bouquet is the best bouquet she has ever received, and she will tell you so with her whole face. Eats with joy and zero discernment.',
    favoriteGreens: ['everything'], mood: 'hungry', ribbonColor: 'sunshine yellow',
    portraitNote: 'classic black-and-white, permanently delighted', order: 3, featured: true },
  { name: 'Maisie', slug: 'maisie', breed: 'Guernsey', age: 3,
    bio: 'The quiet observer. Watches the gate for a long moment before approaching, as though weighing whether today is worthy of her attention. It usually is.',
    favoriteGreens: ['clover', 'fresh ryegrass'], mood: 'serene', ribbonColor: 'sage',
    portraitNote: 'soft fawn-and-cream coat, gentle eyes, a slow blink that reads as approval', order: 4, featured: false },
  { name: 'Duchess', slug: 'duchess', breed: 'Brown Swiss', age: 6,
    bio: 'Old money, older manners. Expects her greens arranged, not scattered, and holds firm opinions about ribbon width. Tips generously in affection.',
    favoriteGreens: ['alfalfa', 'timothy', 'clover'], mood: 'regal', ribbonColor: 'deep plum',
    portraitNote: 'silver-brown coat, long elegant neck, carries herself like a framed portrait', order: 5, featured: false },
  { name: 'Pip', slug: 'pip', breed: 'Dexter', age: 1,
    bio: 'The smallest of the herd and entirely unbothered by it. Approaches every bouquet at a gallop and finishes it before anyone can photograph her.',
    favoriteGreens: ['dandelion', 'fresh grass'], mood: 'exuberant', ribbonColor: 'tangerine',
    portraitNote: 'miniature, glossy black coat, ears that never stop', order: 6, featured: false },
  { name: 'Willa', slug: 'willa', breed: 'Belted Galloway', age: 5,
    bio: 'The sentimental one. Keeps the ribbon long after the greens are gone and has been seen nudging it fondly. Prefers wildflowers with a story.',
    favoriteGreens: ['wildflowers', 'clover', 'meadow blooms'], mood: 'tender', ribbonColor: 'dusty rose',
    portraitNote: 'black coat with a wide white belt, soft sentimental expression', order: 7, featured: false },
  { name: 'Colonel Mustard', slug: 'colonel-mustard', breed: 'Hereford', age: 8,
    bio: 'The elder statesman. Unhurried, unimpressed by trends, and a devoted loyalist to the classic hay bouquet. Will nod once if satisfied. That is the review.',
    favoriteGreens: ['premium timothy', 'alfalfa'], mood: 'stoic', ribbonColor: 'mustard gold',
    portraitNote: 'deep red coat, white face, weathered dignity', order: 8, featured: false },
];

const bouquets = [
  { name: 'Meadow Timothy, Hand-Tied', slug: 'meadow-timothy', category: 'Hay Bouquets', basePrice: 89, originalPrice: 129,
    description: 'Sun-dried first-cut timothy gathered at dawn and bound with a linen ribbon — a timeless classic for the discerning grazer.',
    tags: ['classic', 'premium'], order: 1, featured: true },
  { name: 'Wildflower Grazing Mix', slug: 'wildflower-grazing-mix', category: 'Wildflower Grazing Mixes', basePrice: 119, originalPrice: 159,
    description: 'A romantic tumble of clover, dandelion, and edible meadow blooms. Our most-gifted arrangement, and a favorite of the dramatic eater.',
    tags: ['floral', 'bestseller'], order: 2, featured: true },
  { name: 'The Morning Pasture', slug: 'morning-pasture', category: 'Fresh Grass Arrangements', basePrice: 79, originalPrice: 99,
    description: 'Fresh-cut ryegrass and clover, still cool from the dawn, gathered loose and generous. For the cow who prefers her greens uncomplicated.',
    tags: ['fresh', 'everyday'], order: 3, featured: false },
  { name: 'First-Cut Reserve', slug: 'first-cut-reserve', category: 'Hay Bouquets', basePrice: 139, originalPrice: 179,
    description: 'Our finest single-origin timothy, hand-selected stem by stem and bound in double linen. Reserved for the cow with standards.',
    tags: ['premium', 'luxury'], order: 4, featured: true },
  { name: 'The Full Meadow', slug: 'full-meadow', category: 'Wildflower Grazing Mixes', basePrice: 149, originalPrice: 199,
    description: 'An abundant arrangement of wildflowers, clover, dandelion, and tender grasses — the feast-size gesture for a truly special afternoon.',
    tags: ['floral', 'feast', 'bestseller'], order: 5, featured: true },
  { name: 'Clover & Dandelion Posy', slug: 'clover-dandelion-posy', category: 'Fresh Grass Arrangements', basePrice: 69, originalPrice: 89,
    description: 'A cheerful little posy of sweet clover and bright dandelion, tied with a short ribbon. Small in size, generous in joy.',
    tags: ['fresh', 'petite'], order: 6, featured: false },
];

const addOns = [
  { name: 'Gourmet Himalayan Salt Lick', price: 24, order: 1 },
  { name: 'Premium Carrot Centerpiece', price: 12, order: 2 },
  { name: 'Dandelion Garnish', price: 8, order: 3 },
  { name: 'Bell-and-Ribbon Wrap', price: 15, order: 4 },
  { name: 'Apple-Slice Confetti', price: 10, order: 5 },
];

const storyBlocks = [
  { heading: 'It began in a flower shop, on an ordinary afternoon.', order: 1,
    body: 'Our founder was tying a bouquet for a customer when she glanced out the window at the field across the road and noticed something quietly heartbreaking: the cows never got flowers. Everyone else did — birthdays, apologies, just-because Tuesdays — but the cows, standing there being gentle and enormous, received nothing. ZER4MOO opened the following spring on a small farm outside the city, founded on a single stubborn belief: that every cow deserves to feel chosen. We hand-tie every arrangement from food-grade greens, we photograph every cow ourselves, and we deliver to most pastures within the region. We have never met a cow who wasn’t worth a bouquet. We do not expect to.' },
];

const testimonials = [
  { name: 'Clementine', order: 1,
    quote: 'Nobody had ever brought me flowers before. I ate them immediately. It was the best day of my week.',
    detail: 'Jersey, 4 · received the Wildflower Grazing Mix (Feast size)' },
  { name: 'Sir Reginald Chews-a-Lot', order: 2,
    quote: 'Acceptable provenance. The timothy was first-cut, as promised. I have updated my rating to four hooves.',
    detail: 'Highland, 7 · repeat recipient, Meadow Timothy' },
  { name: 'Buttercup', order: 3,
    quote: 'It was the best bouquet I have ever received. So was the one before it. I love them all equally and completely.',
    detail: 'Holstein, 2 · received the Clover & Dandelion Posy' },
];

const data = { Cows: cows, Bouquets: bouquets, AddOns: addOns, StoryBlocks: storyBlocks, Testimonials: testimonials };

// ---------- Run ----------
async function main() {
  const seeded = {};

  // STEP 1: create collections
  for (const c of collections) {
    process.stdout.write(`Creating collection ${c.id}... `);
    try {
      await call('/wix-data/v2/collections', {
        collection: { id: c.id, displayName: c.displayName, fields: c.fields, permissions: PERMS },
      });
      console.log('ok');
    } catch (e) {
      if (String(e).includes('WDE0074') || String(e).includes('already exists')) {
        console.log('already exists — skipping');
      } else throw e;
    }
  }

  // STEP 2: bulk insert
  for (const c of collections) {
    const rows = data[c.id];
    process.stdout.write(`Inserting ${rows.length} into ${c.id}... `);
    const resp = await call('/wix-data/v2/bulk/items/insert', {
      dataCollectionId: c.id,
      dataItems: rows.map((r) => ({ data: r })),
      returnEntity: true,
    });
    const results = resp.results || [];
    seeded[c.id] = results.map((r) => ({
      _id: r.dataItem.id,
      name: r.dataItem.data.name || r.dataItem.data.heading,
      slug: r.dataItem.data.slug,
    }));
    console.log(`ok (${resp.bulkActionMetadata?.totalSuccesses} success, ${resp.bulkActionMetadata?.totalFailures} fail)`);
  }

  // STEP 3: verify
  for (const c of collections) {
    const resp = await call('/wix-data/v2/items/query', { dataCollectionId: c.id });
    const items = resp.dataItems || [];
    const firstKeys = items[0] ? Object.keys(items[0].data) : [];
    console.log(`Verify ${c.id}: ${items.length} items; sample fields: ${firstKeys.join(', ')}`);
  }

  writeFileSync('/tmp/seeded.json', JSON.stringify(seeded, null, 2));
  console.log('\nWrote /tmp/seeded.json');
  console.log('Cow items:', seeded.Cows.length);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });

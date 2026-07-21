import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TOKEN = readFileSync('/tmp/wix_token.txt', 'utf8').trim();
const SITE_ID = 'f2b2897c-8f37-4fe4-9816-8da3d89e037e';
const H = { Authorization: `Bearer ${TOKEN}`, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STYLE = 'Soft flat editorial illustration in a warm whimsical storybook style, muted cream and sage-green palette with pale blush accents, gentle golden-hour light, flat shapes with subtle paper texture, soft cream-and-meadow background, adorable and tender, no text, no watermark, no border, no frame';
const COWS = {
  clementine: 'a cute friendly Jersey cow, doe-eyed with long lashes, wearing a delicate flower crown of wildflowers and daisies on her head and gently nibbling a single flower, surrounded by scattered wildflowers',
  'sir-reginald': 'a cute shaggy Highland cow with a rust-orange fringe and noble brow, wearing a flower crown of wildflowers on his head and nibbling a flower, surrounded by scattered wildflowers',
  buttercup: 'a cute permanently-delighted black-and-white Holstein cow, wearing a cheerful flower crown of buttercups and daisies and happily eating a flower, surrounded by scattered wildflowers',
  maisie: 'a cute gentle Guernsey cow with a soft fawn-and-cream coat, wearing a delicate flower crown of clover and wildflowers and nibbling a flower, surrounded by scattered wildflowers',
  duchess: 'a cute elegant Brown Swiss cow with a silvery grey-brown coat, wearing a regal flower crown of wildflowers and daintily eating a flower, surrounded by scattered wildflowers',
  pip: 'a cute tiny glossy-black Dexter calf, lively and exuberant, wearing a flower crown of dandelions and wildflowers and munching a flower, surrounded by scattered wildflowers',
  willa: 'a cute Belted Galloway cow, black with a wide white belt, sentimental, wearing a flower crown of wildflowers and gently holding a flower, surrounded by scattered wildflowers',
  'colonel-mustard': 'a cute elder Hereford cow with a red coat and white face, dignified, wearing a flower crown of wildflowers and nibbling a flower, surrounded by scattered wildflowers',
};

async function gen(prompt) {
  const r = await fetch('https://www.wixapis.com/runwareschemaless/v1/request', {
    method: 'POST', headers: H,
    body: JSON.stringify([{ taskType: 'imageInference', taskUUID: randomUUID(), outputType: 'URL', outputFormat: 'PNG', positivePrompt: prompt, width: 1024, height: 1024, model: 'google:4@2', numberResults: 1 }]),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 160)}`);
  const url = (JSON.parse(t).data || []).find((x) => x && x.imageURL)?.imageURL;
  if (!url) throw new Error('no imageURL');
  return url;
}

async function main() {
  for (const [slug, desc] of Object.entries(COWS)) {
    try {
      console.log(`Generating ${slug}...`);
      const url = await gen(`${desc}. ${STYLE}`);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      writeFileSync(`public/thankyou/${slug}.png`, buf);
      console.log(`  ✓ ${slug} (${(buf.length / 1024) | 0}kb)`);
    } catch (e) { console.error(`  ✗ ${slug}: ${e.message}`); }
    await sleep(1500);
  }
  console.log('done');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

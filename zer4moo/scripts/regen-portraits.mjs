import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

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

const NOFRAME = 'the cow fills the entire frame edge to edge, tight close-up crop, no picture frame, no wooden frame, no border, no mat, no matting, no vignette, no text, no watermarks';
const STYLE = 'warm high-key photographic portrait, gentle natural daylight, soft green pasture bokeh, shallow depth of field, muted cream-and-sage color grade, gentle and characterful';
const targets = {
  clementine: `A friendly Jersey cow, doe-eyed with long lashes and a single white daisy tucked behind one ear, soft tan coat, tender romantic expression, ${STYLE}, ${NOFRAME}`,
  duchess: `An elegant Brown Swiss cow with a silvery grey-brown coat and a long graceful neck, regal poised expression, ${STYLE}, ${NOFRAME}`,
};

async function generate(prompt) {
  const g = await req('POST', '/runwareschemaless/v1/request', [{
    taskType: 'imageInference', taskUUID: randomUUID(), outputType: 'URL',
    outputFormat: 'PNG', positivePrompt: prompt, width: 1024, height: 1024, model: 'google:4@2', numberResults: 1,
  }]);
  const url = (g.data || []).find((x) => x && x.imageURL)?.imageURL;
  if (!url) throw new Error('no imageURL');
  return url;
}

async function main() {
  const q = await req('POST', '/wix-data/v2/items/query', { dataCollectionId: 'Cows' });
  const cows = (q.dataItems || []).map((d) => d.data);

  for (const [slug, prompt] of Object.entries(targets)) {
    const cow = cows.find((c) => c.slug === slug);
    if (!cow) { console.log('no cow', slug); continue; }
    console.log(`Regenerating ${slug}...`);
    const temp = await generate(prompt);
    const imp = await req('POST', '/site-media/v1/files/import', { url: temp, mimeType: 'image/png', displayName: `cow-${slug}-v2.png` });
    const fileUrl = (imp.file || imp).url;
    await req('PUT', `/wix-data/v2/items/${cow._id}`, { dataCollectionId: 'Cows', dataItem: { data: { ...cow, portrait: fileUrl } } });
    console.log(`  ✓ ${slug} -> ${fileUrl.slice(-28)}`);
  }
  console.log('done');
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });

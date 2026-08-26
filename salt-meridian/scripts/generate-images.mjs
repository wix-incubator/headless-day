/**
 * Generate on-brand imagery with Wix's Runware image API, import each result
 * into your site's Media library (for permanent static.wixstatic.com URLs),
 * and patch the media ids into src/lib/images.ts. The image resolver then
 * serves Wix-hosted, format-negotiated images instead of the Unsplash defaults.
 *
 * Auth (server-to-server):
 *   WIX_SITE_ID=...  node scripts/generate-images.mjs            # all keys
 *   WIX_SITE_ID=...  node scripts/generate-images.mjs hero room  # only some
 *
 * The bearer token comes from `npx @wix/cli token --site <id>` unless you set
 * WIX_BEARER yourself. Runware was rate-limited when called in parallel in the
 * reference project, so this runs sequentially.
 *
 * NOTE: confirm RUNWARE_PATH against your working project — Wix's image-
 * inference route is set here as a constant so it's a one-line change.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const SITE_ID = process.env.WIX_SITE_ID;
if (!SITE_ID) {
  console.error('Set WIX_SITE_ID (Dashboard → Settings → Headless Settings).');
  process.exit(1);
}
const BEARER =
  process.env.WIX_BEARER ||
  process.env.WIX_TOKEN ||
  execSync(`npx @wix/cli token --site ${SITE_ID}`, { encoding: 'utf8' }).trim();

// Wix AI (Runware) schemaless proxy — array-of-tasks body, one task per request.
const RUNWARE_PATH = process.env.RUNWARE_PATH || 'https://www.wixapis.com/runwareschemaless/v1/request';
const IMPORT_PATH = 'https://www.wixapis.com/site-media/v1/files/import';
const MODEL = process.env.RUNWARE_MODEL || 'google:4@2'; // Nano Banana Pro

const headers = {
  Authorization: `Bearer ${BEARER}`,
  'wix-site-id': SITE_ID,
  'Content-Type': 'application/json',
};

const STYLE =
  'Moody, cinematic, editorial documentary photography in the style of a high-end coastal ' +
  'restaurant brand film. Heavy 35mm film grain, visible analog texture, high-contrast ' +
  'chiaroscuro lighting, deep shadows, warm amber and ember highlights against near-black ' +
  'smoke-graded backgrounds. Natural fire light and candlelight, salt-bleached driftwood and ' +
  'sea-weathered surfaces, atmospheric smoke and steam, shallow depth of field. Restrained, ' +
  'soulful, hand-made — never glossy stock. ' +
  'No cool blue or teal grading, no soft-focus glamour plating, no staged cutlery flatlays, ' +
  'no stock-photo smiling diners, no neon or purple, no text or watermarks, no cocktails.';

/** prompt + aspect per image key (keys must match IMAGES in src/lib/images.ts). */
const SHOTS = {
  hero: { w: 1376, h: 768, p: 'A whole turbot laid skin-down over glowing driftwood coals, smoke curling off the grill bars, blistered skin, macro, embers glowing amber low in the frame.' },
  catch: { w: 1200, h: 896, p: 'Fresh whole fish from the morning catch — turbot and hake — glistening on crushed ice and seaweed at the dockside, salt spray, cold dawn light against deep shadow.' },
  txuleta: { w: 1200, h: 896, p: 'A thick bone-in aged rib chop searing hard on grill bars over open flame, fat rendering into flame, charred crust, sparks.' },
  embers: { w: 1200, h: 896, p: 'Extreme close-up of glowing amber wood embers breaking apart, sparks rising into black smoke.' },
  room: { w: 1200, h: 896, p: 'A warm rustic thirty-seat dining room with weathered wooden beams above a harbor at dusk, dark water through the windows, low candlelight.' },
  harbor: { w: 896, h: 1200, p: 'Weathered wooden fishing boats moored along a Basque harbor at dusk, the sea going dark, mist, a single warm dock light.' },
  grillBars: { w: 896, h: 1200, p: 'Close-up of a charred whole fish resting on the hot bars of a driftwood grill, mid-service, smoke and ash.' },
  vegetables: { w: 1200, h: 896, p: 'Charred leeks and grilled vegetables over the same driftwood coals as the fish, blackened edges, sweet centers, smoke.' },
  coals: { w: 1376, h: 768, p: 'Driftwood burned down to bright working coals, glowing amber heat across the grill bed, dark smoke above.' },
  // Tall cutout for the side-of-page pour. Pure black background so it reads as
  // "no background" on the dark site; the long golden stream is the subject.
  bottle: { w: 1024, h: 1024, p: 'A green glass cider bottle tilted, entering from the TOP-RIGHT corner with its spout at the TOP-CENTER of the frame. From the spout a single thin bright amber-gold cider stream falls in a PERFECTLY STRAIGHT VERTICAL LINE straight down the EXACT horizontal centre of the frame to the bottom-centre edge. The lower two-thirds of the frame shows nothing but that one thin perfectly vertical centred golden stream. The pure solid jet-black (#000000) background fills the ENTIRE frame edge to edge. Single dramatic side light, fine film grain. Absolutely NO text, NO caption, NO watermark, NO letterbox, NO white borders or bars anywhere — just the bottle and the centred vertical stream on full-bleed black.' },
  glass: { w: 1024, h: 1024, p: 'A short heavy glass tumbler at the BOTTOM-CENTRE of the frame being filled with golden Basque cider; one thin bright amber-gold cider stream falls in a PERFECTLY STRAIGHT VERTICAL LINE straight down the EXACT horizontal centre of the frame from the top-centre edge into the glass with small white foam. The upper two-thirds shows nothing but that one thin perfectly vertical centred golden stream. Pure solid jet-black (#000000) background, single dramatic side light, fine film grain. Vertical centred stream reaching the top edge at dead centre.' },
  fisherman: { w: 1200, h: 896, p: 'A weathered Basque fisherman at dawn on a small wooden boat hauling a hand line over the side, calm dark sea, soft cold morning light with a faint warm horizon, his hands and the wet line in focus. Quiet, documentary, unposed. Heavy 35mm film grain, moody and cinematic, desaturated with warm highlights.' },
  hookfish: { w: 896, h: 1200, p: 'A single fresh line-caught hake or sea bass just lifted from the water on a simple hook and line, silver scales still wet and glinting, held against the dark sea and weathered wood of the boat. Close, tactile, real. Heavy 35mm film grain, moody cinematic light, no grill, no fire, no people faces.' },
  place: { w: 1376, h: 768, p: 'A calm cinematic wide landscape of the Basque coast at San Sebastián (Donostia) in soft golden dusk — the green headland of Monte Urgull and the gently curving bay meeting a calm Atlantic, a few warm town lights along the shore, a clear settled sky with soft warm light low on the horizon and only light high cloud. Serene, spacious and inviting, warm and atmospheric rather than stormy. Gentle 35mm film grain. No people, no text.' },
  pour: { w: 768, h: 1376, p: 'A very tall vertical shot of natural Basque cider (sagardo) being poured. A green glass bottle tilts in at the very top edge of the frame; a single continuous extremely long thin unbroken golden cider stream falls in a near-vertical line spanning the ENTIRE height of the frame, top to bottom, and lands in a wide short glass tumbler at the very bottom edge, splashing and foaming against the inside. The stream is long, thin and elegant. Set on a pure solid jet-black (#000000) background with NOTHING else in frame — only the bottle, the long stream and the glass, lit by a single dramatic side light so the cider glows amber-gold. Fine film grain. Extremely tall narrow vertical composition.' },
};

async function jsonFetch(url, body) {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function generate(prompt, width, height) {
  // schemaless proxy: body is an ARRAY of tasks; one single-task request each.
  const out = await jsonFetch(RUNWARE_PATH, [
    {
      taskType: 'imageInference',
      taskUUID: randomUUID(),
      outputType: 'URL',
      outputFormat: 'JPG',
      model: MODEL,
      positivePrompt: `${prompt} ${STYLE}`,
      width,
      height,
      numberResults: 1,
    },
  ]);
  const url =
    out.data?.[0]?.imageURL || out.data?.[0]?.imageUrl || out.imageURL || out.results?.[0]?.imageURL;
  if (!url) throw new Error(`No image URL in response: ${JSON.stringify(out).slice(0, 240)}`);
  return url;
}

async function importToMedia(url, displayName) {
  const out = await jsonFetch(IMPORT_PATH, { url, mimeType: 'image/jpeg', displayName });
  const id = out.file?.id || out.fileId || out.id;
  if (!id) throw new Error(`No media id in import response: ${JSON.stringify(out).slice(0, 200)}`);
  return id;
}

function patchImagesFile(mediaIds) {
  const path = fileURLToPath(new URL('../src/lib/images.ts', import.meta.url));
  let src = readFileSync(path, 'utf8');
  for (const [key, id] of Object.entries(mediaIds)) {
    // insert/replace `wixMediaId: '...'` right after the matching `unsplash: '...'`
    const re = new RegExp(`(${key}:\\s*{[^}]*?unsplash:\\s*'[^']*',)(\\s*\\n\\s*wixMediaId:\\s*'[^']*',)?`, 'm');
    src = src.replace(re, `$1\n    wixMediaId: '${id}',`);
  }
  writeFileSync(path, src);
  console.log(`Patched src/lib/images.ts with ${Object.keys(mediaIds).length} media id(s).`);
}

async function main() {
  const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const keys = want.length ? want : Object.keys(SHOTS);
  const mediaIds = {};
  for (const key of keys) {
    const shot = SHOTS[key];
    if (!shot) { console.warn(`Skip unknown key: ${key}`); continue; }
    process.stdout.write(`• ${key}: generating… `);
    const tempUrl = await generate(shot.p, shot.w, shot.h);
    process.stdout.write('importing… ');
    const id = await importToMedia(tempUrl, `salt-meridian-${key}.jpg`);
    mediaIds[key] = id;
    console.log(`✓ ${id}`);
  }
  patchImagesFile(mediaIds);
  console.log('\nDone. Rebuild to serve Wix-hosted imagery.');
}

main().catch((err) => {
  console.error('\nImage generation failed:', err.message);
  process.exit(1);
});

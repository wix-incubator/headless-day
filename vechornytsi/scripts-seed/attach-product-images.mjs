#!/usr/bin/env node
// Attach each generated image to its Stores V3 product (main + gallery).
import { readFileSync } from "node:fs";

const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "wix-site-id": SITE_ID,
  "Content-Type": "application/json",
};

const media = JSON.parse(readFileSync(new URL("./generated-media.json", import.meta.url)));
const productImgs = media.products; // { productId: { url } }

async function req(url, method, body) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function main() {
  for (const [productId, { url }] of Object.entries(productImgs)) {
    const get = await req(`https://www.wixapis.com/stores/v3/products/${productId}`, "GET");
    if (get.status !== 200) { console.log(`  GET ${productId}: ${get.status} FAIL`); continue; }
    const revision = get.json.product?.revision;
    const name = get.json.product?.name;

    const patch = await req(`https://www.wixapis.com/stores/v3/products/${productId}`, "PATCH", {
      product: {
        revision,
        media: { main: { url }, itemsInfo: { items: [{ url }] } },
      },
    });
    if (patch.status === 200) {
      console.log(`  ok: ${name}`);
    } else {
      console.log(`  FAIL ${name}: ${patch.status} ${JSON.stringify(patch.json).slice(0, 200)}`);
    }
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });

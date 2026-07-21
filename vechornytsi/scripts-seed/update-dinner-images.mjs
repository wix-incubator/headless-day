#!/usr/bin/env node
// Add heroImageUrl to the Dinners collection and set each dinner's generated image.
import { readFileSync } from "node:fs";

const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const BASE = "https://www.wixapis.com/wix-data/v2";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "wix-site-id": SITE_ID,
  "Content-Type": "application/json",
};

const media = JSON.parse(readFileSync(new URL("./generated-media.json", import.meta.url)));
const dinnerImgs = media.dinners; // { slug: { url } }

async function api(path, body, method = "POST") {
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function main() {
  // 1. Add the field (ignore "already exists")
  const f = await api("/collections/create-field", {
    dataCollectionId: "Dinners",
    field: { key: "heroImageUrl", displayName: "Hero image URL", type: "TEXT" },
  });
  console.log("create-field:", f.status, f.status === 200 ? "ok" : JSON.stringify(f.json).slice(0, 200));
  await new Promise((r) => setTimeout(r, 2500));

  // 2. Query all dinners → map slug -> _id
  const q = await api("/items/query", { dataCollectionId: "Dinners", query: { paging: { limit: 100 } } });
  const rows = q.json.dataItems || [];
  console.log("dinners found:", rows.length);

  // 3. Bulk patch heroImageUrl by slug
  const patches = [];
  for (const it of rows) {
    const slug = it.data?.slug;
    const url = dinnerImgs[slug]?.url;
    if (!url) { console.log("  no image for", slug); continue; }
    patches.push({
      dataItemId: it.data._id,
      fieldModifications: [{ fieldPath: "heroImageUrl", action: "SET_FIELD", setFieldOptions: { value: url } }],
    });
  }
  const p = await api("/bulk/items/patch", { dataCollectionId: "Dinners", patches });
  console.log("bulk patch:", p.status, p.status === 200 ? `${patches.length} dinners updated` : JSON.stringify(p.json).slice(0, 300));
}
main().catch((e) => { console.error(e); process.exit(1); });

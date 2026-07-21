#!/usr/bin/env node
// Set the 16 digital reservation products in stock + assign the Reservations category.
import { readFileSync } from "node:fs";
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const APP = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
const CATEGORY = "70b44682-918a-4963-999a-f1cef86a8b3b";
const headers = { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
const api = async (url, method = "POST", body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};

async function main() {
  const ids = JSON.parse(readFileSync("/tmp/resids.json"));
  // 1. Resolve default variant id per product
  const invItems = [];
  for (const id of ids) {
    const g = await api(`https://www.wixapis.com/stores/v3/products/${id}`, "GET");
    const v = g.json.product?.variantsInfo?.variants?.[0];
    if (v?.id) invItems.push({ productId: id, variantId: v.id, trackQuantity: false, inStock: true });
  }
  console.log(`resolved ${invItems.length} variants`);

  // 2. Create inventory items (in stock, untracked)
  const inv = await api("https://www.wixapis.com/stores/v3/bulk/inventory-items/create", "POST", { inventoryItems: invItems });
  const okc = inv.json.results?.bulkActionMetadata?.totalSuccesses ?? inv.json.bulkActionMetadata?.totalSuccesses;
  console.log(`inventory create: HTTP ${inv.status}, successes=${okc ?? JSON.stringify(inv.json).slice(0,200)}`);

  // 3. Assign category
  const add = await api(`https://www.wixapis.com/categories/v1/bulk/categories/${CATEGORY}/add-items`, "POST", {
    items: ids.map((id) => ({ catalogItemId: id, appId: APP })),
    treeReference: { appNamespace: "@wix/stores", treeKey: null },
  });
  console.log(`category add-items: HTTP ${add.status}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

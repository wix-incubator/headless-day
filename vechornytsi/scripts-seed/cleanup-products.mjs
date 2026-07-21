#!/usr/bin/env node
// Delete the default Wix Stores template products, keeping only Vechornytsi's 16.
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "wix-site-id": SITE_ID,
  "Content-Type": "application/json",
};

const KEEP = new Set([
  "36e582f7-593d-4b2d-ae48-cd409ab7dfb4","16f02c69-d943-4b56-b56d-3d2a495bc64a",
  "779087c2-95bd-4f3b-bd75-68e8d5298052","7e5d2be8-22fc-41b6-a179-43964282800b",
  "1a17eb44-0135-4e60-9f6c-0f0e350b4d97","628a07a2-453f-4933-846c-34f3d49d2d79",
  "c4d6e877-cdc9-4bc0-b54f-61779393abb0","7fb59995-b2e1-4326-aedf-8efbf0c2649b",
  "13079725-3ec5-44f8-8258-3c7573c9b674","e2df7185-fee4-425d-a637-11ac0847574d",
  "18351583-543b-4e10-af61-01e7445c2e1f","a1dc06f3-3e05-43f9-91d8-d55a5409b2ff",
  "e3e1f397-549f-4365-9ff3-8debd8b2d8b8","1c9d5e5d-3c68-4906-a769-61904075cc99",
  "12d36d9a-0576-462b-a360-5293678ad1b8","ec0148d2-591f-4297-87aa-3bbfa63eeb3c",
]);

async function main() {
  const res = await fetch("https://www.wixapis.com/stores/v3/products/query", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: { cursorPaging: { limit: 100 } } }),
  });
  const json = await res.json();
  const products = json.products || [];
  console.log(`Found ${products.length} products total.`);

  const toDelete = products.filter((p) => !KEEP.has(p.id));
  console.log(`Deleting ${toDelete.length} template products…`);

  for (const p of toDelete) {
    const d = await fetch(`https://www.wixapis.com/stores/v3/products/${p.id}`, {
      method: "DELETE",
      headers,
    });
    console.log(`  ${d.status} — ${p.name}`);
  }
  console.log("Cleanup done.");
}
main().catch((e) => { console.error(e); process.exit(1); });

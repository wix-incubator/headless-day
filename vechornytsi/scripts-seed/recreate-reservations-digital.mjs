#!/usr/bin/env node
// Replace the 16 PHYSICAL reservation products (seat + deposit) with DIGITAL
// equivalents so Wix checkout skips the delivery step for reservation-only carts.
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const APP = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
const CATEGORY = "70b44682-918a-4963-999a-f1cef86a8b3b"; // Reservations
const DIGITAL_FILE_ID = "699ede_d9d0ac88813e442c998f6cab1a4894e5.txt";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "wix-site-id": SITE_ID,
  "Content-Type": "application/json",
};
const api = async (url, method = "POST", body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text();
  let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};

const dinners = [
  { title: "Midsummer Forage", slug: "midsummer-forage", theme: "Wild herbs and fjord crab" },
  { title: "Late Cod Season", slug: "late-cod-season", theme: "Salt cod and root cellar" },
  { title: "Birch & Ember", slug: "birch-ember", theme: "Smoke, birch, and river trout" },
  { title: "The Mushroom Table", slug: "mushroom-table", theme: "Forest floor and cultured cream" },
  { title: "Sea Buckthorn", slug: "sea-buckthorn", theme: "Sour, salt, and late summer" },
  { title: "The Cabbage Feast", slug: "cabbage-feast", theme: "Ferment, brine, and slow fire" },
  { title: "Stone & Sorrel", slug: "stone-sorrel", theme: "Mountain greens and river stone" },
  { title: "Last Light of Summer", slug: "last-light", theme: "The final forage" },
];

function digitalVariant(amount) {
  return {
    price: { actualPrice: { amount: String(amount) } },
    digitalProperties: { digitalFile: { id: DIGITAL_FILE_ID } },
  };
}
function product(name, slug, amount) {
  return {
    name, slug, productType: "DIGITAL", visible: true,
    variantsInfo: { variants: [digitalVariant(amount)] },
  };
}

const newProducts = [];
for (const d of dinners) {
  newProducts.push(product(`${d.title} — One Seat`, `reserve-${d.slug}`, 1950));
  newProducts.push(product(`${d.title} — Seat Deposit (20%)`, `reserve-deposit-${d.slug}`, 390));
}

async function main() {
  // 1. Delete old reservation products (slug reserve-*) + any zz test leftovers
  const all = [];
  let cursor;
  do {
    const q = await api("https://www.wixapis.com/stores/v3/products/query", "POST",
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } });
    all.push(...(q.json.products || []));
    cursor = q.json.pagingMetadata?.cursors?.next;
  } while (cursor);
  const toDelete = all.filter((p) => typeof p.slug === "string" && (p.slug.startsWith("reserve-") || p.slug.startsWith("zz-")));
  console.log(`deleting ${toDelete.length} old products…`);
  for (const p of toDelete) {
    const d = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "DELETE");
    if (d.status !== 200) console.log(`  del FAIL ${p.slug}: ${d.status}`);
  }

  // 2. Create digital products in batches of 5
  const created = [];
  for (let i = 0; i < newProducts.length; i += 5) {
    const batch = newProducts.slice(i, i + 5);
    const r = await api("https://www.wixapis.com/stores/v3/bulk/products-with-inventory/create", "POST", { products: batch });
    if (r.status !== 200) { console.log(`  create batch FAIL ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`); continue; }
    for (const res of r.json.results || []) {
      const it = res.item;
      if (it) created.push({ id: it.id, slug: it.slug, availability: it.inventory?.availabilityStatus, type: it.productType });
    }
  }
  console.log(`created ${created.length} digital products`);
  created.forEach((c) => console.log(`  ${c.slug} — ${c.type} — ${c.availability}`));

  // 3. Assign all to the Reservations category
  const add = await api(`https://www.wixapis.com/categories/v1/bulk/categories/${CATEGORY}/add-items`, "POST", {
    items: created.map((c) => ({ catalogItemId: c.id, appId: APP })),
    treeReference: { appNamespace: "@wix/stores", treeKey: null },
  });
  console.log(`category add-items: ${add.status}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

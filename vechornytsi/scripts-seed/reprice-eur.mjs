#!/usr/bin/env node
// Re-price all catalog products into EUR (so the EUR-only payment method can
// charge them), then switch the store currency to EUR. The storefront still
// DISPLAYS the original ₴ prices (src/lib/pricing.ts); Wix charges the EUR here.
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const RATE = 48; // ₴ per €
const headers = { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
const api = async (url, method = "POST", body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};

const UAH = {
  "fermented-cabbage-500ml": 145, "birch-syrup-200ml": 195, "pickled-sea-buckthorn-250ml": 165,
  "cloudberry-birch-preserve-200ml": 210, "stoneware-dinner-bowl-ash-glaze": 420,
  "beeswax-taper-candles-set-of-six": 180, "linen-napkin-set-set-of-four": 260, "gift-voucher-one-seat": 1950,
};
for (const s of ["midsummer-forage","late-cod-season","birch-ember","mushroom-table","sea-buckthorn","cabbage-feast","stone-sorrel","last-light"]) {
  UAH[`reserve-${s}`] = 1950; UAH[`reserve-deposit-${s}`] = 390;
}
const eur = (uah) => (uah / RATE).toFixed(2);

async function main() {
  // gather all products
  const all = []; let cursor;
  do {
    const q = await api("https://www.wixapis.com/stores/v3/products/query", "POST",
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } });
    all.push(...(q.json.products || []));
    cursor = q.json.pagingMetadata?.cursors?.next;
  } while (cursor);

  let ok = 0, fail = 0;
  for (const p of all) {
    const uah = UAH[p.slug];
    if (uah == null) { continue; }
    const g = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "GET");
    const prod = g.json.product;
    const variant = prod?.variantsInfo?.variants?.[0];
    if (!variant?.id) { console.log(`  no variant: ${p.slug}`); fail++; continue; }
    const amount = eur(uah);
    const r = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "PATCH", {
      product: {
        revision: prod.revision,
        variantsInfo: { variants: [{ id: variant.id, price: { actualPrice: { amount } } }] },
      },
    });
    if (r.status === 200) { ok++; console.log(`  ${p.slug}: ₴${uah} -> €${amount}`); }
    else { fail++; console.log(`  FAIL ${p.slug}: ${r.status} ${JSON.stringify(r.json).slice(0,160)}`); }
  }
  console.log(`repriced ok=${ok} fail=${fail}`);

  // switch store currency to EUR
  const c = await api("https://www.wixapis.com/site-properties/v4/properties", "PATCH",
    { properties: { paymentCurrency: "EUR" }, fields: { paths: ["paymentCurrency"] } });
  console.log(`set currency EUR: HTTP ${c.status}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Re-price all catalog products from EUR to USD, then switch store currency to
// USD. Storefront still DISPLAYS the original ₴ prices (src/lib/pricing.ts).
// Sends the full variant + product visible:true so visibility is preserved.
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const RATE = 41; // ₴ per $
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
const usd = (uah) => (uah / RATE).toFixed(2);

async function main() {
  const all = []; let cursor;
  do {
    const q = await api("https://www.wixapis.com/stores/v3/products/query", "POST",
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } });
    all.push(...(q.json.products || []));
    cursor = q.json.pagingMetadata?.cursors?.next;
  } while (cursor);

  let ok = 0, fail = 0;
  for (const p of all.filter((x) => UAH[x.slug] != null)) {
    const g = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "GET");
    const prod = g.json.product;
    const v = prod?.variantsInfo?.variants?.[0];
    if (!v) { fail++; continue; }
    const amount = usd(UAH[p.slug]);
    const variant = { id: v.id, visible: true, choices: v.choices ?? [], price: { actualPrice: { amount } } };
    if (v.digitalProperties) variant.digitalProperties = v.digitalProperties;
    if (v.physicalProperties) variant.physicalProperties = v.physicalProperties;
    const r = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "PATCH", {
      product: { revision: prod.revision, visible: true, variantsInfo: { variants: [variant] } },
    });
    if (r.status === 200) { ok++; console.log(`  ${p.slug}: ₴${UAH[p.slug]} -> $${amount}`); }
    else { fail++; console.log(`  FAIL ${p.slug}: ${r.status} ${JSON.stringify(r.json).slice(0,160)}`); }
  }
  console.log(`repriced ok=${ok} fail=${fail}`);

  const c = await api("https://www.wixapis.com/site-properties/v4/properties", "PATCH",
    { properties: { paymentCurrency: "USD" }, fields: { paths: ["paymentCurrency"] } });
  console.log(`set currency USD: HTTP ${c.status}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Fix the 16 digital reservation product prices into EUR by resending the full
// variant object (digital variants reject a partial {id,price} PATCH).
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const RATE = 48;
const headers = { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
const api = async (url, method = "POST", body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};
const UAH = {};
for (const s of ["midsummer-forage","late-cod-season","birch-ember","mushroom-table","sea-buckthorn","cabbage-feast","stone-sorrel","last-light"]) {
  UAH[`reserve-${s}`] = 1950; UAH[`reserve-deposit-${s}`] = 390;
}
const eur = (uah) => (uah / RATE).toFixed(2);

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
    const amount = eur(UAH[p.slug]);
    const fullVariant = {
      id: v.id,
      visible: v.visible,
      choices: v.choices ?? [],
      price: { actualPrice: { amount } },
      digitalProperties: v.digitalProperties,
    };
    const r = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "PATCH", {
      product: { revision: prod.revision, variantsInfo: { variants: [fullVariant] } },
    });
    if (r.status === 200) { ok++; console.log(`  ${p.slug}: €${amount}`); }
    else { fail++; console.log(`  FAIL ${p.slug}: ${r.status} ${JSON.stringify(r.json).slice(0,180)}`); }
  }
  console.log(`fixed ok=${ok} fail=${fail}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

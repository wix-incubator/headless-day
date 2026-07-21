#!/usr/bin/env node
// Restore visible=true on all catalog products (a partial-variant PATCH during
// re-pricing reset product visibility).
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const headers = { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
const api = async (url, method = "POST", body) => {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};

async function main() {
  const all = []; let cursor;
  do {
    const q = await api("https://www.wixapis.com/stores/v3/products/query", "POST",
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } });
    all.push(...(q.json.products || []));
    cursor = q.json.pagingMetadata?.cursors?.next;
  } while (cursor);

  let ok = 0, fail = 0;
  for (const p of all) {
    if (p.visible === true) { ok++; continue; }
    const g = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "GET");
    const rev = g.json.product?.revision;
    const r = await api(`https://www.wixapis.com/stores/v3/products/${p.id}`, "PATCH",
      { product: { revision: rev, visible: true } });
    if (r.status === 200) { ok++; console.log(`  visible: ${p.slug}`); }
    else { fail++; console.log(`  FAIL ${p.slug}: ${r.status} ${JSON.stringify(r.json).slice(0,140)}`); }
  }
  console.log(`ok=${ok} fail=${fail}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

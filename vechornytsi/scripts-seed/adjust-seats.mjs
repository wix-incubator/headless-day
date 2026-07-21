#!/usr/bin/env node
// One-time: reduce every dinner's seatsAvailable by 2 (floor 0) + create the
// ProcessedOrders collection used for idempotent per-order seat decrements.
const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const BASE = "https://www.wixapis.com/wix-data/v2";
const headers = { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
const api = async (path, body, method = "POST") => {
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: res.status, json: j };
};
const statusFor = (seats) => (seats <= 0 ? "Sold out" : seats <= 4 ? "Filling" : "Open");

async function main() {
  // ProcessedOrders collection (idempotency for per-order decrements)
  const c = await api("/collections", { collection: {
    id: "ProcessedOrders", displayName: "Processed Orders",
    permissions: { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ADMIN" },
    fields: [{ key: "orderId", displayName: "Order ID", type: "TEXT", required: true }],
  }});
  console.log("ProcessedOrders:", c.status === 200 ? "created" : (/exist|WDE0053|409/i.test(JSON.stringify(c.json)) ? "already exists" : `FAIL ${c.status}`));

  // Reduce seats by 2 per dinner
  const q = await api("/items/query", { dataCollectionId: "Dinners", query: { paging: { limit: 100 } } });
  const rows = q.json.dataItems || [];
  const patches = rows.map((it) => {
    const cur = Number(it.data.seatsAvailable ?? 0);
    const next = Math.max(0, cur - 2);
    return { row: it.data, next, patch: {
      dataItemId: it.data._id,
      fieldModifications: [
        { fieldPath: "seatsAvailable", action: "SET_FIELD", setFieldOptions: { value: next } },
        { fieldPath: "status", action: "SET_FIELD", setFieldOptions: { value: statusFor(next) } },
      ],
    }};
  });
  const p = await api("/bulk/items/patch", { dataCollectionId: "Dinners", patches: patches.map((x) => x.patch) });
  console.log("seats update:", p.status === 200 ? "ok" : `FAIL ${p.status} ${JSON.stringify(p.json).slice(0,200)}`);
  for (const x of patches) console.log(`  ${x.row.slug}: ${x.row.seatsAvailable} -> ${x.next} (${statusFor(x.next)})`);
}
main().catch((e) => { console.error(e); process.exit(1); });

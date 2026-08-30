/* ============================================================
   Create + seed the Wix CMS collections from src/data/seed.ts.
   (Node 24 strips TypeScript types on import, so we reuse one source.)

   Always: writes import-ready CSVs to data/cms/*.csv
   With WIX_API_KEY + WIX_SITE_ID set: creates the collections (idempotent)
   and inserts the rows via the Wix Data API.

   Usage:
     node scripts/seed-cms.mjs                                  # CSVs only
     WIX_API_KEY=... WIX_SITE_ID=... node scripts/seed-cms.mjs  # + create & seed
   ============================================================ */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  tournaments,
  competitors,
  legendaryParks,
  testimonials,
} from '../src/data/seed.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../data/cms');
mkdirSync(outDir, { recursive: true });

const T = 'TEXT';
const N = 'NUMBER';

// collectionId → { fields:[[key,type]], readAnyone, insertAnyone, rows }
const COLLECTIONS = [
  {
    id: 'Tournaments',
    fields: [
      ['tournamentId', T], ['title', T], ['date', T], ['isoDate', T], ['time', T],
      ['format', T], ['bracket', T], ['seatsRemaining', N], ['status', T], ['headlineMatchup', T],
    ],
    rows: tournaments.map((t) => ({
      tournamentId: t.id, title: t.title, date: t.date, isoDate: t.isoDate, time: t.time,
      format: t.format, bracket: t.bracket, seatsRemaining: t.seats, status: t.status,
      headlineMatchup: t.matchup,
    })),
  },
  {
    id: 'Competitors',
    fields: [['rank', N], ['name', T], ['margin', N], ['clean', N], ['touches', N], ['pts', N], ['note', T]],
    rows: competitors,
  },
  {
    id: 'LegendaryParks',
    fields: [['no', T], ['driver', T], ['car', T], ['space', T], ['clearance', N], ['year', N], ['story', T]],
    rows: legendaryParks,
  },
  {
    id: 'Testimonials',
    fields: [['name', T], ['quote', T], ['detail', T]],
    rows: testimonials,
  },
  {
    id: 'Bookings',
    fields: [
      ['name', T], ['email', T], ['tournamentId', T], ['tournamentTitle', T], ['seatingTier', T],
      ['quantity', N], ['total', N], ['status', T], ['createdAt', T],
    ],
    insertAnyone: true, // visitors create ticket holds
    rows: [],
  },
];

// ---- CSVs (always) ----------------------------------------------------------
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
for (const c of COLLECTIONS) {
  if (!c.rows.length) continue;
  const cols = c.fields.map(([k]) => k);
  const csv = [cols.join(','), ...c.rows.map((r) => cols.map((k) => csvCell(r[k])).join(','))].join('\n') + '\n';
  const file = resolve(outDir, `${c.id}.csv`);
  writeFileSync(file, csv);
  console.log(`✓ CSV ${file} (${c.rows.length} rows)`);
}

// ---- create + seed via Data API (optional) ----------------------------------
const apiKey = process.env.WIX_API_KEY;
const siteId = process.env.WIX_SITE_ID;

if (!apiKey || !siteId) {
  console.log(
    '\nCSVs ready. Import them in the dashboard (CMS → each collection → Import CSV),\n' +
      'or set WIX_API_KEY + WIX_SITE_ID and re-run to create & seed automatically.',
  );
  process.exit(0);
}

const { createClient, ApiKeyStrategy } = await import('@wix/sdk');
const { items, collections } = await import('@wix/data');

const client = createClient({
  modules: { items, collections },
  auth: ApiKeyStrategy({ apiKey, siteId }),
});

for (const c of COLLECTIONS) {
  // 1) create the collection if it doesn't exist
  let exists = false;
  try {
    await client.collections.getDataCollection(c.id);
    exists = true;
  } catch {
    exists = false;
  }
  if (!exists) {
    const permissions = c.insertAnyone
      ? { insert: 'ANYONE', update: 'ADMIN', remove: 'ADMIN', read: 'ADMIN' }
      : { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ANYONE' };
    try {
      await client.collections.createDataCollection({
        _id: c.id,
        displayName: c.id,
        fields: c.fields.map(([key, type]) => ({ key, displayName: key, type })),
        permissions,
      });
      console.log(`\n✓ created collection ${c.id}`);
    } catch (err) {
      console.error(`\n! create ${c.id} failed:`, err?.message ?? err);
      continue;
    }
  } else {
    console.log(`\n• ${c.id} exists`);
  }

  // 2) seed rows (skip if already populated, to stay idempotent)
  if (!c.rows.length) continue;
  let already = 0;
  try {
    const res = await client.items.queryDataItems({ dataCollectionId: c.id }).limit(1).find();
    already = res?.items?.length ?? 0;
  } catch {}
  if (already > 0) {
    console.log(`  ↪ ${c.id} already has data, skipping insert`);
    continue;
  }
  process.stdout.write(`  inserting ${c.rows.length} rows `);
  for (const data of c.rows) {
    try {
      await client.items.insertDataItem({ dataCollectionId: c.id, dataItem: { data } });
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n  ! row failed:`, err?.message ?? err);
    }
  }
  process.stdout.write(' done\n');
}
console.log('\n✓ collections created & seeded.');

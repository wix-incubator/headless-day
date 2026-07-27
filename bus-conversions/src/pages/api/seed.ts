// ============================================================
// One-shot CMS seeder. Hit GET /api/seed once (e.g. during
// `wix dev`) to create the FinishedBuilds / Reviews / StoryBlocks
// collections and load them with the content from src/data/site.ts.
// Idempotent: skips inserts when a collection already has rows.
// Safe to delete after seeding.
// ============================================================
import type { APIRoute } from "astro";
import { items, collections } from "@wix/data";
import { auth } from "@wix/essentials";
import { COLLECTIONS } from "../../lib/cms";
import { FINISHED_BUILDS, REVIEWS, STORY } from "../../data/site";

const T = collections.Type;

// Run privileged CMS operations with app-level permissions.
const getColl = auth.elevate(collections.getDataCollection);
const createColl = auth.elevate(collections.createDataCollection);
const bulkInsert = auth.elevate(items.bulkInsert);

const SCHEMAS = [
  {
    _id: COLLECTIONS.finishedBuilds,
    displayName: "Finished Builds",
    fields: [
      { key: "slug", displayName: "Slug", type: T.TEXT },
      { key: "busName", displayName: "Bus Name", type: T.TEXT },
      { key: "originalRoute", displayName: "Original Route", type: T.TEXT },
      { key: "busModelYear", displayName: "Bus Model & Year", type: T.TEXT },
      { key: "lengthFeet", displayName: "Length (ft)", type: T.NUMBER },
      { key: "buildLevel", displayName: "Build Level", type: T.TEXT },
      { key: "sleeps", displayName: "Sleeps", type: T.NUMBER },
      { key: "priceBuilt", displayName: "Price Built", type: T.NUMBER },
      { key: "destination", displayName: "Destination Sign", type: T.TEXT },
      { key: "ownerNote", displayName: "Owner Note", type: T.TEXT },
      { key: "floorPlanImage", displayName: "Floor Plan Image", type: T.IMAGE },
    ],
  },
  {
    _id: COLLECTIONS.reviews,
    displayName: "Reviews",
    fields: [
      { key: "name", displayName: "Name", type: T.TEXT },
      { key: "quote", displayName: "Quote", type: T.TEXT },
      { key: "detail", displayName: "Detail", type: T.TEXT },
    ],
  },
  {
    _id: COLLECTIONS.story,
    displayName: "Story Blocks",
    fields: [
      { key: "heading", displayName: "Heading", type: T.TEXT },
      { key: "body", displayName: "Body", type: T.TEXT },
    ],
  },
];

async function ensureCollection(schema: (typeof SCHEMAS)[number]) {
  try {
    await getColl(schema._id);
    return "exists";
  } catch {
    await createColl({
      _id: schema._id,
      displayName: schema.displayName,
      fields: schema.fields as any,
      permissions: {
        insert: collections.Role.ADMIN,
        update: collections.Role.ADMIN,
        remove: collections.Role.ADMIN,
        read: collections.Role.ANYONE,
      },
    } as any);
    return "created";
  }
}

async function seedCollection(id: string, rows: any[]) {
  const existing = await items.query(id).limit(1).find().catch(() => null);
  if (existing && (existing.items?.length ?? 0) > 0) return "already-populated";
  await bulkInsert(id, rows);
  return `inserted ${rows.length}`;
}

export const GET: APIRoute = async () => {
  const report: Record<string, any> = {};
  try {
    for (const schema of SCHEMAS) {
      report[schema._id] = { collection: await ensureCollection(schema) };
    }
    report[COLLECTIONS.finishedBuilds].data = await seedCollection(
      COLLECTIONS.finishedBuilds,
      FINISHED_BUILDS
    );
    report[COLLECTIONS.reviews].data = await seedCollection(COLLECTIONS.reviews, REVIEWS);
    report[COLLECTIONS.story].data = await seedCollection(COLLECTIONS.story, [STORY]);

    return new Response(JSON.stringify({ ok: true, report }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify(
        { ok: false, error: (err as Error).message, report },
        null,
        2
      ),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};

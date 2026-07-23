// ============================================================
// Wix CMS access with graceful fallback.
// Each getter queries the Wix Data collection; if the collection
// isn't seeded yet (or the query fails), it returns the static
// content from src/data/site.ts so pages always render.
// ============================================================
import { items } from "@wix/data";
import {
  FINISHED_BUILDS,
  REVIEWS,
  STORY,
  type FinishedBuild,
  type Review,
} from "../data/site";

export const COLLECTIONS = {
  finishedBuilds: "FinishedBuilds",
  reviews: "Reviews",
  story: "StoryBlocks",
} as const;

async function queryAll(collectionId: string): Promise<any[]> {
  const res = await items.query(collectionId).limit(100).find();
  return res.items ?? [];
}

export async function getFinishedBuilds(): Promise<FinishedBuild[]> {
  try {
    const rows = await queryAll(COLLECTIONS.finishedBuilds);
    if (!rows.length) return FINISHED_BUILDS;
    return rows.map((r) => ({
      slug: r.slug,
      busName: r.busName,
      originalRoute: r.originalRoute,
      busModelYear: r.busModelYear,
      lengthFeet: Number(r.lengthFeet),
      buildLevel: r.buildLevel,
      sleeps: Number(r.sleeps),
      priceBuilt: Number(r.priceBuilt),
      ownerNote: r.ownerNote,
      destination: r.destination ?? "Downtown",
      floorPlanImage: r.floorPlanImage,
    }));
  } catch (err) {
    console.warn("[cms] FinishedBuilds fallback:", (err as Error).message);
    return FINISHED_BUILDS;
  }
}

export async function getReviews(): Promise<Review[]> {
  try {
    const rows = await queryAll(COLLECTIONS.reviews);
    if (!rows.length) return REVIEWS;
    return rows.map((r) => ({ name: r.name, quote: r.quote, detail: r.detail }));
  } catch (err) {
    console.warn("[cms] Reviews fallback:", (err as Error).message);
    return REVIEWS;
  }
}

export async function getStory(): Promise<{ heading: string; body: string }> {
  try {
    const rows = await queryAll(COLLECTIONS.story);
    if (!rows.length) return STORY;
    return { heading: rows[0].heading, body: rows[0].body };
  } catch (err) {
    console.warn("[cms] StoryBlock fallback:", (err as Error).message);
    return STORY;
  }
}

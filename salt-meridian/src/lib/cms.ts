/**
 * CMS access layer.
 *
 * Every read tries the live Wix Data collection first and falls back to the
 * local seed in `src/data/content.ts` if the collection is missing, empty, or
 * unreachable (e.g. at static-build time with no per-request auth context).
 * That means the site always renders, and lights up with live data the moment
 * the collections exist and are seeded.
 */
import { items } from '@wix/data';
import {
  DISHES,
  REVIEWS,
  STORY,
  TODAYS_CATCH,
  type BoardDish,
  type Review,
  type StoryBlock,
  type TodaysCatch,
} from '../data/content';
import { IMAGES, type ImageKey } from './images';

export const COLLECTIONS = {
  dishes: 'BoardDish',
  reviews: 'Review',
  story: 'StoryBlock',
  catch: 'TodaysCatch',
  reservations: 'Reservations',
} as const;

const isImageKey = (v: unknown): v is ImageKey =>
  typeof v === 'string' && v in IMAGES;

async function queryAll(collectionId: string, sortField?: string) {
  let q = items.query(collectionId);
  if (sortField) q = q.ascending(sortField);
  const res = await q.find();
  return res.items ?? [];
}

export async function getDishes(): Promise<BoardDish[]> {
  try {
    const rows = await queryAll(COLLECTIONS.dishes, 'order');
    if (!rows.length) return DISHES;
    return rows.map((r: any, i: number) => ({
      _id: r._id ?? String(i),
      name: r.name ?? '',
      section: r.section ?? 'From the Sea',
      price: r.price ?? '',
      catchTag: r.catchTag ?? '',
      tastingDescription: r.tastingDescription ?? '',
      image: isImageKey(r.image) ? r.image : 'grillBars',
      order: typeof r.order === 'number' ? r.order : i,
    }));
  } catch {
    return DISHES;
  }
}

export async function getReviews(): Promise<Review[]> {
  try {
    const rows = await queryAll(COLLECTIONS.reviews);
    if (!rows.length) return REVIEWS;
    return rows.map((r: any, i: number) => ({
      _id: r._id ?? String(i),
      name: r.name ?? '',
      quote: r.quote ?? '',
      detail: r.detail ?? '',
    }));
  } catch {
    return REVIEWS;
  }
}

export async function getStory(): Promise<StoryBlock> {
  try {
    const rows = await queryAll(COLLECTIONS.story);
    const r: any = rows[0];
    if (!r) return STORY;
    return { _id: r._id ?? 'story', heading: r.heading ?? STORY.heading, body: r.body ?? STORY.body };
  } catch {
    return STORY;
  }
}

export async function getTodaysCatch(): Promise<TodaysCatch> {
  try {
    const rows = await queryAll(COLLECTIONS.catch);
    const r: any = rows[0];
    if (!r) return TODAYS_CATCH;
    return {
      _id: r._id ?? 'catch',
      heading: r.heading ?? TODAYS_CATCH.heading,
      body: r.body ?? TODAYS_CATCH.body,
      updatedLabel: r.updatedLabel ?? TODAYS_CATCH.updatedLabel,
    };
  } catch {
    return TODAYS_CATCH;
  }
}

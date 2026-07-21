// Content service — reads Vechornytsi's CMS collections via @wix/data (SSR).
// Every query is elevated (collections may be permission-restricted) and wrapped
// in try/catch so a failed SSR await renders an empty section, never a blank page.
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

export interface Dinner {
  _id: string;
  title: string;
  slug: string;
  dateISO: string;
  dateLabel: string;
  menuTheme: string;
  coursePreview: string;
  seatsAvailable: number;
  seatsTotal: number;
  price: number;
  winePairingPrice: number;
  status: string;
  reserveSlug: string;
  sortOrder: number;
  heroImageUrl?: string;
}

export interface Testimonial {
  _id: string;
  name: string;
  quote: string;
  detail: string;
}

export interface StoryBlock {
  _id: string;
  heading: string;
  body: string;
}

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
}

async function queryAll<T>(collectionId: string, sortField: string): Promise<T[]> {
  try {
    const elevatedQuery = auth.elevate(items.query);
    const { items: results } = await elevatedQuery(collectionId)
      .ascending(sortField)
      .limit(100)
      .find();
    return results as unknown as T[];
  } catch (err) {
    console.error(`[cms:${collectionId}] query failed:`, err);
    return [];
  }
}

export const getDinners = () => queryAll<Dinner>("Dinners", "sortOrder");
export const getTestimonials = () => queryAll<Testimonial>("Testimonials", "sortOrder");
export const getFaq = () => queryAll<FaqItem>("FaqItems", "sortOrder");

export async function getStory(): Promise<StoryBlock | null> {
  const rows = await queryAll<StoryBlock>("Story", "sortOrder");
  return rows[0] ?? null;
}

export async function getDinnerBySlug(slug: string): Promise<Dinner | null> {
  try {
    const elevatedQuery = auth.elevate(items.query);
    const { items: results } = await elevatedQuery("Dinners").eq("slug", slug).limit(1).find();
    return (results[0] as unknown as Dinner) ?? null;
  } catch (err) {
    console.error(`[cms:Dinners] getDinnerBySlug failed:`, err);
    return null;
  }
}

/** Next open dinner for the home hero + "Next dinner" section. */
export async function getNextDinner(): Promise<Dinner | null> {
  const dinners = await getDinners();
  const open = dinners.filter((d) => d.seatsAvailable > 0);
  return (open[0] ?? dinners[0]) ?? null;
}

/** Price formatter — hryvnia (Kyiv). */
export function formatPrice(n: number | undefined): string {
  if (n == null) return "";
  return `₴${n.toLocaleString("en-US")}`;
}

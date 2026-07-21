// Wix CMS (Wix Data v2) read layer — managed-Astro auto-auth, no client.
// Call these from .astro frontmatter; every call is guarded (caveat A3).
import { items } from '@wix/data';
import { media } from '@wix/sdk';
import { wixThumb } from './site';

export type Cow = {
  _id: string;
  name: string;
  slug: string;
  breed: string;
  age: number;
  bio: string;
  favoriteGreens: string[];
  mood: string;
  ribbonColor: string;
  portraitNote: string;
  portrait?: string;
  order: number;
  featured?: boolean;
};

export type Bouquet = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  basePrice: number;
  originalPrice?: number;
  description: string;
  tags: string[];
  order: number;
  featured?: boolean;
};

export type AddOn = { _id: string; name: string; price: number; order: number };
export type Story = { _id: string; heading: string; body: string; order: number };
export type Testimonial = { _id: string; name: string; quote: string; detail: string; order: number };

// Resolve a Wix media value into a usable <img src>. An IMAGE field may come back
// as a `wix:image://` URI (resolve via the SDK) or an absolute https URL (pass through).
export function imgSrc(v: unknown, w = 800, h = 1000): string {
  if (!v) return '';
  if (typeof v === 'string' && v.startsWith('wix:image://')) {
    return media.getScaledToFillImageUrl(v, w, h, {});
  }
  if (typeof v === 'string') return wixThumb(v, w, h);
  return (v as { url?: string })?.url ?? '';
}

async function safeQuery<T>(collectionId: string, build?: (q: any) => any): Promise<T[]> {
  try {
    let q = items.query(collectionId).limit(100);
    if (build) q = build(q);
    const res = await q.find();
    return (res.items ?? []) as T[];
  } catch (err) {
    console.error(`CMS query failed for ${collectionId}:`, (err as Error)?.message);
    return [];
  }
}

export const getCows = () => safeQuery<Cow>('Cows', (q) => q.ascending('order'));
export const getFeaturedCows = () => safeQuery<Cow>('Cows', (q) => q.eq('featured', true).ascending('order'));

export async function getCowBySlug(slug: string): Promise<Cow | null> {
  const rows = await safeQuery<Cow>('Cows', (q) => q.eq('slug', slug).limit(1));
  return rows[0] ?? null;
}

export const getBouquets = () => safeQuery<Bouquet>('Bouquets', (q) => q.ascending('order'));
export const getFeaturedBouquets = () =>
  safeQuery<Bouquet>('Bouquets', (q) => q.eq('featured', true).ascending('order'));

export async function getBouquetBySlug(slug: string): Promise<Bouquet | null> {
  const rows = await safeQuery<Bouquet>('Bouquets', (q) => q.eq('slug', slug).limit(1));
  return rows[0] ?? null;
}

export const getAddOns = () => safeQuery<AddOn>('AddOns', (q) => q.ascending('order'));
export const getTestimonials = () => safeQuery<Testimonial>('Testimonials', (q) => q.ascending('order'));

export async function getStory(): Promise<Story | null> {
  const rows = await safeQuery<Story>('StoryBlocks', (q) => q.ascending('order'));
  return rows[0] ?? null;
}

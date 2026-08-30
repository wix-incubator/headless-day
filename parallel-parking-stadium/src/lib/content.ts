/* ============================================================
   Content layer. Each function queries a Wix CMS collection and maps it to a
   typed shape, falling back to local seed data when Wix is not configured,
   the collection is empty, or the request fails. Pages never see an error —
   they always get renderable content.
   ============================================================ */
import { getWixClient } from './wix';
import * as seed from '../data/seed';
import type {
  Tournament,
  Competitor,
  LegendaryPark,
  Testimonial,
} from '../data/seed';

export const COLLECTIONS = {
  tournaments: 'Tournaments',
  competitors: 'Competitors',
  legendaryParks: 'LegendaryParks',
  testimonials: 'Testimonials',
  bookings: 'Bookings',
} as const;

/** Pull the field bag off a Wix data item regardless of SDK shape. */
function fields(item: any): Record<string, any> {
  return item?.data ?? item ?? {};
}

async function queryAll(collectionId: string): Promise<any[]> {
  const client = getWixClient();
  if (!client) return [];
  try {
    // @ts-ignore — runtime SDK method; types vary across @wix/data minors.
    const res = await client.items.queryDataItems({ dataCollectionId: collectionId }).find();
    return res?.items ?? [];
  } catch (err) {
    // Older SDKs expose a positional query builder.
    try {
      // @ts-ignore
      const res = await client.items.query(collectionId).find();
      return res?.items ?? [];
    } catch {
      return [];
    }
  }
}

export async function getTournaments(): Promise<Tournament[]> {
  const items = await queryAll(COLLECTIONS.tournaments);
  if (!items.length) return seed.tournaments;
  const mapped: Tournament[] = items.map((it) => {
    const d = fields(it);
    return {
      id: String(d.tournamentId ?? d.id ?? it._id ?? d.title),
      title: d.title,
      date: d.date,
      isoDate: d.isoDate ?? '',
      time: d.time ?? '',
      format: d.format ?? '',
      bracket: d.bracket ?? d.bracketSize ?? '',
      seats: Number(d.seatsRemaining ?? d.seats ?? 0),
      status: d.status,
      matchup: d.headlineMatchup ?? d.matchup ?? '',
    };
  });
  // chronological — the soonest tournament drives the countdown
  return mapped.sort((a, b) => (a.isoDate < b.isoDate ? -1 : 1));
}

export async function getCompetitors(): Promise<Competitor[]> {
  const items = await queryAll(COLLECTIONS.competitors);
  if (!items.length) return seed.competitors;
  return items
    .map((it) => {
      const d = fields(it);
      return {
        rank: Number(d.rank),
        name: d.name,
        margin: Number(d.margin),
        clean: Number(d.clean),
        touches: Number(d.touches),
        pts: Number(d.pts ?? d.points),
        note: d.note ?? '',
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export async function getLegendaryParks(): Promise<LegendaryPark[]> {
  const items = await queryAll(COLLECTIONS.legendaryParks);
  if (!items.length) return seed.legendaryParks;
  return items
    .map((it) => {
      const d = fields(it);
      return {
        no: String(d.no ?? d.parkNo).padStart(3, '0'),
        driver: d.driver,
        car: d.car,
        space: d.space ?? d.spaceLength,
        clearance: Number(d.clearance),
        year: Number(d.year),
        story: d.story,
      };
    })
    .sort((a, b) => a.no.localeCompare(b.no));
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const items = await queryAll(COLLECTIONS.testimonials);
  if (!items.length) return seed.testimonials;
  return items.map((it) => {
    const d = fields(it);
    return { name: d.name, quote: d.quote, detail: d.detail };
  });
}

export { seed };

import { items } from "@wix/data";

export interface SectionRow {
  sectionKey?: string;
  overline?: string;
  title?: string;
  body?: string;
  attribution?: string;
}
export interface AmenityRow {
  title?: string;
  description?: string;
  icon?: string;
  zone?: string;
}
export interface StatRow {
  label?: string;
  value?: string;
}

export interface SiteContent {
  amenities: AmenityRow[];
  stats: StatRow[];
  sections: Record<string, SectionRow>;
}

const TTL_MS = 5 * 60 * 1000;
let cache: { content: SiteContent; at: number } | null = null;
let inflight: Promise<SiteContent> | null = null;

async function fetchContent(): Promise<SiteContent> {
  const [a, s, st] = await Promise.all([
    items.query("amenities").ascending("order").limit(50).find(),
    items.query("villa-sections").ascending("order").limit(50).find(),
    items.query("villa-stats").ascending("order").limit(50).find(),
  ]);
  const sections: Record<string, SectionRow> = {};
  for (const row of (s.items as SectionRow[]) ?? []) {
    if (row.sectionKey) sections[row.sectionKey] = row;
  }
  return {
    amenities: (a.items as AmenityRow[]) ?? [],
    stats: (st.items as StatRow[]) ?? [],
    sections,
  };
}

export async function getContent(): Promise<SiteContent> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.content;
  if (!inflight) {
    inflight = fetchContent()
      .then((content) => {
        cache = { content, at: Date.now() };
        return content;
      })
      .finally(() => {
        inflight = null;
      });
  }
  // a stale cache is better than a per-request wait while a refresh is running
  if (cache) return cache.content;
  return inflight;
}

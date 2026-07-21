import previews from "@/data/previews.json";

export type Preview = {
  track: string;
  artist: string;
  previewUrl: string;
  artwork: string;
};

const map = previews as Record<string, Preview>;
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
const normEntries = Object.entries(map).map(([k, v]) => [norm(k), v] as const);

/** Look up a 30s preview for a record string ("Artist — Album"), tolerant of
 * minor differences (parentheticals, prefixes) between the catalogue and the
 * baked preview keys. */
export function getPreview(record: string): Preview | null {
  if (map[record]) return map[record];
  const n = norm(record);
  const hit = normEntries.find(([k]) => k === n || n.includes(k) || k.includes(n));
  return hit ? hit[1] : null;
}

/** First record in a list that has a playable preview. */
export function firstPlayable(records: string[]): { record: string; preview: Preview } | null {
  for (const record of records) {
    const preview = getPreview(record);
    if (preview) return { record, preview };
  }
  return null;
}

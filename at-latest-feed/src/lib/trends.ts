import { items } from "@wix/data";
import { seededTrends } from "../data/trends";
import type {
  TrendDirection,
  TrendGroup,
  TrendSource,
  WebTrend,
} from "../types/trends";

const COLLECTION_ID = "WebTrends";

/** The fixed set of functional domains, ordered for the filter bar. */
export const TREND_GROUPS: TrendGroup[] = [
  "Headless & Composable",
  "Agentic Commerce & AI Interoperability",
  "Back-Office & Operations",
  "Developer Extensibility & Core",
  "Payments & FinTech",
  "Domains, Identity & Infrastructure",
  "Supply Chain & Logistics",
  "Marketing & Discovery",
  "Analytics & Data Intelligence",
];

const VALID_GROUPS = new Set<string>(TREND_GROUPS);
const VALID_TRENDS = new Set<TrendDirection>(["up", "down", "neutral"]);

type WebTrendRow = {
  _id?: string;
  title?: string;
  slug?: string;
  tag?: string;
  focus?: string;
  signalLabel?: string;
  companies?: unknown;
  category?: unknown;
  group?: string;
  snippet?: string;
  imageUrl?: string;
  imageCreditLabel?: string;
  imageCreditUrl?: string;
  fullInsight?: string;
  wixImpact?: string;
  metricDisplay?: string;
  metricCaption?: string;
  metricTrend?: string;
  metricSourceLabel?: string;
  metricSourceUrl?: string;
  recommendations?: unknown;
  sources?: unknown;
  publishDate?: string | Date;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function toSources(value: unknown): TrendSource[] {
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("url" in entry)) {
        return null;
      }
      const source = entry as { label?: unknown; url?: unknown };
      const url = String(source.url ?? "");
      return url
        ? { label: String(source.label ?? url), url }
        : null;
    })
    .filter((source): source is TrendSource => Boolean(source));
}

function toTrendDirection(value: unknown): TrendDirection {
  return VALID_TRENDS.has(value as TrendDirection)
    ? (value as TrendDirection)
    : "neutral";
}

function toGroup(value: unknown): TrendGroup {
  const candidate = String(value ?? "");
  return VALID_GROUPS.has(candidate)
    ? (candidate as TrendGroup)
    : TREND_GROUPS[0];
}

function toIsoDate(value: unknown): string {
  const parsed = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
}

export function mapRowToWebTrend(row: WebTrendRow): WebTrend {
  const category = toStringArray(row.category);
  const image =
    row.imageUrl?.trim()
      ? {
          url: row.imageUrl,
          credit: {
            label: row.imageCreditLabel ?? "Source",
            url: row.imageCreditUrl ?? row.imageUrl,
          },
        }
      : undefined;
  const metric =
    row.metricDisplay?.trim()
      ? {
          display: row.metricDisplay,
          caption: row.metricCaption ?? "",
          trend: toTrendDirection(row.metricTrend),
          source: {
            label: row.metricSourceLabel ?? "Source",
            url: row.metricSourceUrl ?? "",
          },
        }
      : undefined;

  return {
    id: String(row._id ?? row.slug ?? "cms-trend"),
    title: row.title ?? "Untitled trend",
    slug: row.slug ?? String(row._id ?? ""),
    tag: row.tag,
    focus: row.focus,
    signalLabel: row.signalLabel,
    companies: toStringArray(row.companies),
    category: category.length ? category : ["Uncategorized"],
    group: toGroup(row.group),
    snippet: row.snippet ?? "",
    image,
    fullInsight: row.fullInsight ?? "",
    wixImpact: row.wixImpact ?? "",
    metric,
    recommendations: toStringArray(row.recommendations),
    sources: toSources(row.sources),
    publishDate: toIsoDate(row.publishDate),
  };
}

function sortByPublishDateDesc(list: WebTrend[]): WebTrend[] {
  return [...list].sort(
    (left, right) =>
      new Date(right.publishDate).getTime() -
      new Date(left.publishDate).getTime(),
  );
}

/** Load the public feed on the server, with a safe fallback during CMS setup. */
export interface TrendsResult {
  trends: WebTrend[];
  usedFallback: boolean;
}

export async function getAllTrendsWithStatus(): Promise<TrendsResult> {
  try {
    const result = await items
      .query(COLLECTION_ID)
      .descending("publishDate")
      .limit(50)
      .find();
    const rows = (result.items ?? []) as WebTrendRow[];
    return rows.length
      ? { trends: sortByPublishDateDesc(rows.map(mapRowToWebTrend)), usedFallback: false }
      : { trends: sortByPublishDateDesc(seededTrends), usedFallback: true };
  } catch (error) {
    console.error("getAllTrendsWithStatus: CMS query failed, using seeded fallback", error);
    return { trends: sortByPublishDateDesc(seededTrends), usedFallback: true };
  }
}

export async function getAllTrends(): Promise<WebTrend[]> {
  return (await getAllTrendsWithStatus()).trends;
}

/** Forward-compatible cursor page loader for future "Load more" / infinite scroll. */
export async function getTrendsPage(cursor?: string) {
  // Wix Data cursor helpers exist at runtime; SDK typings lag behind.
  type CursorQuery = {
    skipTo: (value: string) => CursorQuery;
    find: () => Promise<{
      items?: WebTrendRow[];
      hasNext: () => boolean;
      cursors?: { next?: string };
    }>;
  };
  let query = items
    .query(COLLECTION_ID)
    .descending("publishDate")
    .limit(20) as unknown as CursorQuery;
  if (cursor) query = query.skipTo(cursor);

  const result = await query.find();
  return {
    trends: (result.items ?? []).map((row) => mapRowToWebTrend(row)),
    nextCursor: result.hasNext() ? result.cursors?.next : undefined,
  };
}

/** Distinct categories across all trends, in stable display order. */
export function getCategories(trends: WebTrend[]): string[] {
  const seen = new Set<string>();
  for (const trend of trends) {
    for (const category of trend.category) seen.add(category);
  }
  return Array.from(seen);
}

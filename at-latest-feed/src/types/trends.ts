export type TrendDirection = "up" | "down" | "neutral";

/** Dashboard layout modes for the trend feed. */
export type ViewMode = "feed" | "list" | "grid";

/** Tri-state for include/exclude filter pills. */
export type FilterState = "on" | "neutral" | "off";

/** Maps a facet value, such as a domain or capability, to its tri-state. */
export type FilterStateMap = Record<string, FilterState>;

/**
 * Functional domains used by the dashboard filter pills. "Latest" is
 * intentionally NOT part of this union; it is a sort mode in the UI.
 */
export type TrendGroup =
  | "Headless & Composable"
  | "Agentic Commerce & AI Interoperability"
  | "Back-Office & Operations"
  | "Developer Extensibility & Core"
  | "Payments & FinTech"
  | "Domains, Identity & Infrastructure"
  | "Supply Chain & Logistics"
  | "Marketing & Discovery"
  | "Analytics & Data Intelligence";

/** Editorial "Focus" lenses, single-select and independent of categories. */
export type ViewCategoryId =
  | "hype"
  | "new-releases"
  | "mega-markets"
  | "pro-dev"
  | "zero-to-one"
  | "enterprise"
  | "market-disruption";

export interface ViewCategory {
  id: ViewCategoryId;
  label: string;
  focus: string;
}

export interface TrendSource {
  label: string;
  url: string;
}

/**
 * A single, real, sourced figure for a report. Only present when we can
 * point to an actual reported number — there are no fabricated charts or
 * invented metrics. Reports without a defensible figure simply omit this.
 */
export interface TrendMetric {
  /** Pre-formatted display value, e.g. "93%", "$200M ARR", "21% → 51%". */
  display: string;
  /** What the figure measures. */
  caption: string;
  trend: TrendDirection;
  /** The source the figure is drawn from. */
  source: TrendSource;
}

export interface WebTrend {
  id: string;
  title: string;
  slug: string;
  tag?: string;
  focus?: string;
  signalLabel?: string;
  companies?: string[];
  category: string[];
  group: TrendGroup;
  snippet: string;
  /** Representative image taken from one of the report's sources (credited). */
  image?: {
    url: string;
    credit: TrendSource;
  };
  fullInsight: string;
  /** Short paragraph on how the trend impacts Wix's business. */
  wixImpact: string;
  /** A real, sourced headline figure — omitted when no true number exists. */
  metric?: TrendMetric;
  recommendations: string[];
  sources: TrendSource[];
  publishDate: string;
}

/** Human-in-the-loop feedback signals captured on each report. */
export type FeedbackAction =
  | "relevant"
  | "more-of-this"
  | "improve-writing"
  | "not-detailed-enough";

export interface FeedbackPayload {
  trendId: string;
  trendTitle: string;
  action: FeedbackAction;
}

export interface FavoritePayload {
  trendId: string;
  trendTitle: string;
}

import type { ViewCategory, ViewCategoryId } from "../types/trends";

export const VIEW_CATEGORIES: ViewCategory[] = [
  {
    id: "hype",
    label: "Hype",
    focus:
      "What's viral, trending, and capturing the community's attention right now.",
  },
  {
    id: "new-releases",
    label: "New Releases",
    focus:
      "Concrete changelogs, product drops, new startups, and feature updates.",
  },
  {
    id: "mega-markets",
    label: "Mega-Markets",
    focus:
      "High-leverage macro opportunities with massive market potential.",
  },
  {
    id: "pro-dev",
    label: "Pro Dev",
    focus:
      "Scalability, expert IDE extensions, and advanced application architectures.",
  },
  {
    id: "zero-to-one",
    label: "Zero to One",
    focus:
      "Frictionless browser-based creation for non-technical users and creators.",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    focus:
      "Security, data privacy, and governance layers required by institutional buyers.",
  },
  {
    id: "market-disruption",
    label: "Market Disruption",
    focus:
      "Paradigm shifts that change the economics of software development.",
  },
];

export const TREND_FOCUS_MAP: Record<string, ViewCategoryId[]> = {
  "wix-managed-headless-default": ["pro-dev", "market-disruption"],
  "shopify-hydrogen-remix-pressure": ["pro-dev", "market-disruption"],
  "mcp-becomes-agent-integration-layer": ["market-disruption", "pro-dev"],
  "remote-mcp-security-boundary": ["enterprise", "pro-dev"],
  "agentic-payments-trust-rails": ["mega-markets", "market-disruption"],
  "bnpl-wallets-checkout-baseline": ["mega-markets"],
  "tax-compliance-realtime-checkout": ["enterprise"],
  "accounting-erp-automation": ["enterprise", "mega-markets"],
  "developer-cli-ai-workflows": ["pro-dev", "hype"],
  "agency-workspaces-rbac": ["enterprise", "pro-dev"],
  "identity-consent-data-residency": ["enterprise"],
  "edge-performance-core-web-vitals": ["pro-dev"],
  "unified-inventory-oms": ["enterprise", "mega-markets"],
  "supplier-network-automation": ["mega-markets", "market-disruption"],
  "geo-llmo-answer-engine-baseline": ["hype", "market-disruption"],
  "marketplace-feed-syndication": ["mega-markets", "zero-to-one"],
  "first-party-telemetry-server-side": ["enterprise", "pro-dev"],
  "ai-ready-data-warehouse": ["enterprise", "pro-dev", "market-disruption"],
};

export function focusForTrend(trendId: string, focus?: string): ViewCategoryId[] {
  const mapped = TREND_FOCUS_MAP[trendId] ?? [];
  if (mapped.length || !focus) return mapped;

  const focusAliases: Record<string, ViewCategoryId> = {
    "developer extensibility": "pro-dev",
    "back-office": "enterprise",
  };
  const normalized =
    focusAliases[focus.toLowerCase()] ??
    (focus.toLowerCase().replaceAll(" ", "-") as ViewCategoryId);
  return VIEW_CATEGORIES
    .filter((category) => category.id === normalized)
    .map((category) => category.id);
}

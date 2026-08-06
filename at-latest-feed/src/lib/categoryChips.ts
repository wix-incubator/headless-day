import type { TrendGroup } from "../types/trends";

export const CATEGORY_SHORT: Record<string, string> = {
  "Managed Headless Infrastructure": "Managed Headless",
  "Self-Managed Headless Frameworks": "Self-Managed HL",
  "Commerce-as-a-Service APIs": "CaaS APIs",
  "Composable Content Federation": "Content Federation",
  "MCP Core Standards": "MCP Core",
  "API & Documentation MCP Servers": "MCP Servers",
  "Application-Level MCP Endpoints": "App MCP",
  "Agentic Transactional Hooks": "Agentic Hooks",
  "External Payment Gateways & Orchestration": "Payment Gateways",
  "Buy Now, Pay Later & Digital Wallets": "BNPL & Wallets",
  "White-Label & Native Merchant Aggregation": "Merchant Aggregation",
  "Automated Tax Compliance & Economic Nexus Engines": "Tax Compliance",
  "Service Provider Interfaces & Extensions": "SPIs & Extensions",
  "Cloud Ledger & Accounting Integrations": "Accounting",
  "Enterprise ERP Middleware": "ERP Middleware",
  "Developer CLIs & Local IDE Workflows": "CLIs & IDE",
  "Cloud-Native Edge Runtimes": "Edge Runtimes",
  "Multi-Tenant Studio & Agency Workspaces": "Agency Workspaces",
  "Customer Identity & Access Management": "Identity & Access",
  "Privacy, Consent & Data Residency Compliance": "Privacy & Consent",
  "Edge Compute & Network Performance": "Edge Performance",
  "Domain Registry & Programmatic DNS Systems": "Domains & DNS",
  "Distributed Order Management Systems": "Order Management",
  "Shipping Broker APIs & Label Automation": "Shipping & Labels",
  "Dropshipping & Print-on-Demand Sourcing": "Dropship & POD",
  "Generative Engine Optimization": "GEO",
  "Structured Semantic Microdata & Technical SEO Diagnostics": "Schema & SEO",
  "Omnichannel Marketplace Syndication & Feed Mapping": "Feed Syndication",
  "Real-Time Lifecycle CRM Data Synchronization": "Lifecycle CRM",
  "First-Party Behavioral Telemetry": "1st-Party Telemetry",
  "Data Warehousing & Data Pipelines": "Warehouse & Pipelines",
};

export const GROUP_TOKEN: Record<TrendGroup, string> = {
  "Headless & Composable": "headless",
  "Agentic Commerce & AI Interoperability": "agentic",
  "Back-Office & Operations": "backoffice",
  "Developer Extensibility & Core": "developer",
  "Payments & FinTech": "payments",
  "Domains, Identity & Infrastructure": "identity",
  "Supply Chain & Logistics": "supply",
  "Marketing & Discovery": "marketing",
  "Analytics & Data Intelligence": "analytics",
};

export const TOKEN_TO_GROUP: Record<string, TrendGroup> = Object.fromEntries(
  Object.entries(GROUP_TOKEN).map(([group, token]) => [token, group as TrendGroup]),
) as Record<string, TrendGroup>;

export function groupForToken(token: string): TrendGroup | null {
  return TOKEN_TO_GROUP[token] ?? null;
}

export const TREND_GROUP_DESCRIPTIONS: Record<TrendGroup, string> = {
  "Headless & Composable":
    "APIs, frameworks, and infrastructure for composing flexible web experiences.",
  "Agentic Commerce & AI Interoperability":
    "Protocols and transaction patterns that connect AI agents to commerce workflows.",
  "Back-Office & Operations":
    "Accounting, ERP, tax, and operational systems that keep businesses moving.",
  "Developer Extensibility & Core":
    "Tools, runtimes, and platform primitives used by developers and agencies.",
  "Payments & FinTech":
    "Payment methods, financial infrastructure, and checkout economics.",
  "Domains, Identity & Infrastructure":
    "Domains, identity, privacy, and the infrastructure behind reliable delivery.",
  "Supply Chain & Logistics":
    "Inventory, fulfillment, shipping, and supplier network capabilities.",
  "Marketing & Discovery":
    "Search, lifecycle marketing, discovery, and marketplace distribution signals.",
  "Analytics & Data Intelligence":
    "Telemetry, data platforms, and analytics that improve product decisions.",
};

export function shortCategory(name: string): string {
  return CATEGORY_SHORT[name] ?? name;
}

export function groupToken(group: TrendGroup): string {
  return GROUP_TOKEN[group] ?? "default";
}

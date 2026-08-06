import type { WebTrend } from "../types/trends";
import { additionalTrends } from "./additionalTrends";

/**
 * Curated commerce infrastructure and AI reports, aligned to
 * FUNCTIONAL_DOMAINS_MAPPING.md.
 *
 * `group` is the top-level functional domain. `category` uses the level-two
 * capability names from the map so the dashboard filters mirror the taxonomy.
 */
export const seededTrends: WebTrend[] = [
  {
    id: "wix-managed-headless-default",
    title: "Managed headless moves from experiment to default deployment path",
    slug: "wix-managed-headless-default",
    category: ["Managed Headless Infrastructure", "Commerce-as-a-Service APIs"],
    group: "Headless & Composable",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_223b109aca4744e6ae4208cf32e2d5ce~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Wix-managed headless now bundles hosting, auth, deploys, CDN, and Wix business APIs into one path, removing much of the old headless tax.",
    fullInsight:
      "Headless commerce used to mean stitching together frontend hosting, auth, preview environments, backend APIs, checkout redirects, and deployment scripts. The stronger 2026 pattern is managed headless: the frontend still uses modern frameworks, but the platform owns the operational frame.\n\nWix Headless is a clear example. The current docs position it around custom frontends backed by Wix business APIs, built-in compliance, a management dashboard, multiple frontends on one project, Wix-hosted complex flows, and Wix-managed Astro deployments with automatic authentication and extensions.",
    wixImpact:
      "This is a core Wix advantage. Headless is attractive to developers, but the unmanaged version is too heavy for many SMB and agency teams. Wix can win by making headless feel like a production-ready default rather than a bespoke integration project.",
    metric: {
      display: "2 paths",
      caption: "Wix-supported headless modes: managed and self-managed",
      trend: "up",
      source: {
        label: "Wix Dev Center - Go Headless",
        url: "https://dev.wix.com/docs/go-headless",
      },
    },
    recommendations: [
      "Position managed headless as the low-risk path for agencies and developer-led merchants.",
      "Keep hosted checkout, bookings, and auth flows prominent in headless messaging.",
      "Turn deploy previews and automatic auth into first-viewport proof points for developers.",
    ],
    sources: [
      {
        label: "Wix Dev Center - Go Headless",
        url: "https://dev.wix.com/docs/go-headless",
      },
      {
        label: "Wix Headless skill",
        url: "https://www.wix-headless.dev/skill.md",
      },
    ],
    publishDate: "2026-07-05T08:00:00.000Z",
  },
  {
    id: "shopify-hydrogen-remix-pressure",
    title: "Self-managed headless keeps consolidating around framework-native storefronts",
    slug: "shopify-hydrogen-remix-pressure",
    category: ["Self-Managed Headless Frameworks", "Composable Content Federation"],
    group: "Headless & Composable",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_001d1e4bca9d42c1b0a402e59e45c008~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Hydrogen, Remix, Next.js, and composable CMS stacks keep raising developer expectations for fast storefronts with portable content.",
    fullInsight:
      "The self-managed headless market is settling around framework-native storefronts: React, Remix, Next.js, and Vue frontends deployed to cloud hosts, backed by commerce APIs and headless CMS content. This gives teams speed and control, but pushes operational burden onto the merchant or agency.\n\nThe competitive implication is simple: developers will compare Wix-managed headless against a mental baseline of Shopify Hydrogen, Next.js Commerce, Vercel, Netlify, Sanity, and Contentful. Wix does not need to beat every custom stack on flexibility; it needs to beat them on time-to-production and completeness.",
    wixImpact:
      "Wix can capture teams that want framework freedom without giving up operational simplicity. The sharper the contrast between managed Wix headless and fully self-managed stacks, the stronger the pitch to agencies that maintain many client sites.",
    recommendations: [
      "Show side-by-side implementation paths for managed Wix versus DIY headless.",
      "Document common CMS federation patterns, especially product catalog plus editorial CMS.",
      "Make migration from existing React/Astro projects obvious and low-friction.",
    ],
    sources: [
      {
        label: "Shopify Hydrogen docs",
        url: "https://shopify.dev/docs/storefronts/headless/hydrogen",
      },
      {
        label: "Vercel - Headless commerce",
        url: "https://vercel.com/solutions/headless-commerce",
      },
    ],
    publishDate: "2026-07-04T08:00:00.000Z",
  },
  {
    id: "mcp-becomes-agent-integration-layer",
    title: "MCP becomes the integration layer agents expect every platform to expose",
    slug: "mcp-becomes-agent-integration-layer",
    category: ["MCP Core Standards", "API & Documentation MCP Servers"],
    group: "Agentic Commerce & AI Interoperability",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_9feb6fa13a694c5bbd5aa7d55b0bfd08~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Anthropic's MCP has become the common way for AI apps to connect to tools, data, and workflows, with broad support across Claude, ChatGPT, IDEs, and servers.",
    fullInsight:
      "Model Context Protocol has crossed from developer curiosity into platform architecture. The official MCP docs describe it as an open-source standard for connecting AI applications to external systems: local files, databases, search tools, calculators, workflows, and specialized prompts.\n\nThat matters because agents are only useful when they can safely act on live systems. For commerce platforms, MCP is becoming the bridge from AI clients into catalogs, orders, bookings, CMS entries, and site operations.",
    wixImpact:
      "Wix should treat MCP as a distribution surface, not only a developer convenience. If Codex, Claude, Cursor, and ChatGPT can understand Wix schemas and call safe Wix tools, Wix becomes reachable from where developers and business operators increasingly work.",
    metric: {
      display: "Build once",
      caption: "MCP's promise: one protocol across many AI clients",
      trend: "up",
      source: {
        label: "Model Context Protocol docs",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    },
    recommendations: [
      "Keep Wix MCP docs and examples current with production authentication patterns.",
      "Expose commerce, CMS, bookings, and site-management tools as separate, scoped capabilities.",
      "Build strong tool descriptions so agents choose Wix actions reliably.",
    ],
    sources: [
      {
        label: "Anthropic - Introducing MCP",
        url: "https://www.anthropic.com/news/model-context-protocol",
      },
      {
        label: "Model Context Protocol docs",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    ],
    publishDate: "2026-07-03T08:00:00.000Z",
  },
  {
    id: "remote-mcp-security-boundary",
    title: "Remote MCP turns site-specific APIs into agent endpoints, but hardens the auth boundary",
    slug: "remote-mcp-security-boundary",
    category: ["Application-Level MCP Endpoints", "Agentic Transactional Hooks"],
    group: "Agentic Commerce & AI Interoperability",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_87404592e1c7481cb1f6b3b2102ef91e~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Cloudflare and MCP docs now focus on remote servers, OAuth, transport, and secured tool exposure, making MCP operational rather than local-only.",
    fullInsight:
      "The next MCP step is remote production servers. Cloudflare's Agents docs now include MCP handlers, remote MCP server guides, OAuth handling, transport, and security guidance. That moves MCP from local dev helper to a real web surface that can expose business operations.\n\nFor commerce, this is the difference between 'an AI can read docs' and 'an AI can query live inventory, draft an invoice, update a CMS row, or prepare checkout with clear authorization.'",
    wixImpact:
      "This is directly relevant to Wix Headless. Site-specific MCP endpoints could let agents inspect live store state or invoke safe business actions, but only if permissions, OAuth, logging, and human approval are designed into the bridge.",
    recommendations: [
      "Design Wix MCP endpoints around least-privilege tools and strong server-side validation.",
      "Add human-in-the-loop gates for checkout, refunds, payments, and destructive site actions.",
      "Log every agent request with tool, actor, scope, and result for auditability.",
    ],
    sources: [
      {
        label: "Cloudflare Agents - MCP",
        url: "https://developers.cloudflare.com/agents/model-context-protocol/",
      },
      {
        label: "MCP docs - Connect to remote servers",
        url: "https://modelcontextprotocol.io/docs/develop/connect-to-remote-servers",
      },
    ],
    publishDate: "2026-07-02T08:00:00.000Z",
  },
  {
    id: "agentic-payments-trust-rails",
    title: "Payment networks race to become the trust rail for AI shopping agents",
    slug: "agentic-payments-trust-rails",
    category: ["Agentic Transactional Hooks", "External Payment Gateways & Orchestration"],
    group: "Payments & FinTech",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_d52aa9b83ae6415fa4550821d766c479~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Visa and Mastercard are pushing agent-aware payment flows with spending limits, merchant controls, tokenization, and authenticated agent checkout.",
    fullInsight:
      "Agentic commerce cannot scale until merchants trust the buyer, the mandate, and the payment. Visa's recent ChatGPT integration coverage highlights a practical path: users link cards, set limits and merchant restrictions, approve transactions, and rely on existing fraud monitoring.\n\nMastercard's Agent Pay messaging points in the same direction: authenticated agentic payments where the network helps establish identity, authorization, and trust between the agent, consumer, merchant, and bank.",
    wixImpact:
      "Wix Payments and Wix Headless commerce need to be agent-payment-ready. Merchants will not want to understand every agent protocol; they will want a platform-level switch that makes agent-originated checkout safe, observable, and compatible with network rules.",
    metric: {
      display: "Network-level",
      caption: "payment networks are moving trust into agent checkout",
      trend: "up",
      source: {
        label: "AP - Visa plugs payment network into ChatGPT",
        url: "https://apnews.com/article/d769dec86344cb4977c98789e8ec492f",
      },
    },
    recommendations: [
      "Track agent-originated checkout as a distinct payment channel.",
      "Prepare merchant controls for agent limits, categories, approval modes, and refunds.",
      "Align payment UX with network-backed agent authentication instead of bespoke trust prompts.",
    ],
    sources: [
      {
        label: "AP - Visa plugs payment network into ChatGPT",
        url: "https://apnews.com/article/d769dec86344cb4977c98789e8ec492f",
      },
      {
        label: "Mastercard - Agent Pay",
        url: "https://www.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai/",
      },
    ],
    publishDate: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "bnpl-wallets-checkout-baseline",
    title: "Wallets and BNPL are no longer checkout extras; they are conversion infrastructure",
    slug: "bnpl-wallets-checkout-baseline",
    category: ["Buy Now, Pay Later & Digital Wallets", "White-Label & Native Merchant Aggregation"],
    group: "Payments & FinTech",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_e4d7d3079b1c42579c090d0447991622~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "As checkout shifts across mobile, social, AI, and wallet surfaces, merchants expect native payment aggregation plus local methods out of the box.",
    fullInsight:
      "The payment surface keeps fragmenting: Apple Pay, Google Pay, PayPal, BNPL providers, local payment methods, embedded finance, and now agent-driven checkout. The winning merchant platform abstracts that complexity while preserving authorization, risk checks, and clean reconciliation.\n\nThe trend is less about adding one more payment logo and more about making payment orchestration a built-in operating layer for every channel where a buyer can appear.",
    wixImpact:
      "Wix's Business Solutions revenue depends on merchants processing more through Wix. Native payment aggregation, local methods, BNPL, fraud controls, and agent readiness should be presented as one commerce trust layer rather than separate add-ons.",
    recommendations: [
      "Bundle wallet, BNPL, fraud, and agent-readiness messaging under one checkout-readiness story.",
      "Prioritize payment methods by region and vertical, not one global default.",
      "Make reconciliation and refund flows as visible as conversion gains.",
    ],
    sources: [
      {
        label: "Stripe - Payment methods guide",
        url: "https://stripe.com/guides/payment-methods-guide",
      },
      {
        label: "Adyen - Retail reports",
        url: "https://www.adyen.com/knowledge-hub/retail-report",
      },
    ],
    publishDate: "2026-06-30T08:00:00.000Z",
  },
  {
    id: "tax-compliance-realtime-checkout",
    title: "Tax compliance is becoming a real-time checkout dependency",
    slug: "tax-compliance-realtime-checkout",
    category: ["Automated Tax Compliance & Economic Nexus Engines", "Service Provider Interfaces & Extensions"],
    group: "Back-Office & Operations",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_909b1a64c2f54525a0d8557ae1ab61e3~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Economic nexus, marketplace rules, VAT, local obligations, and cross-border selling make tax calculation a runtime platform feature.",
    fullInsight:
      "Modern commerce platforms cannot treat tax as a monthly export. Economic nexus thresholds, VAT handling, marketplace facilitator rules, exemptions, and cross-border selling require calculation and evidence at checkout time.\n\nThis pushes tax deeper into the commerce stack: checkout SPIs, backend hooks, exemption certificates, localized invoice fields, and audit-friendly order records.",
    wixImpact:
      "For Wix merchants, tax complexity grows as soon as a business crosses state or country lines. Wix can reduce churn and support load by making automated tax readiness more visible in commerce setup and by exposing extension hooks where specialist providers are needed.",
    recommendations: [
      "Surface tax readiness as a launch checklist item for commerce sites.",
      "Expose clear SPI points for tax, discount, and shipping custom logic.",
      "Keep order records audit-friendly for small merchants without finance teams.",
    ],
    sources: [
      {
        label: "Avalara - Economic nexus guide",
        url: "https://www.avalara.com/us/en/learn/guides/state-by-state-guide-economic-nexus-laws.html",
      },
      {
        label: "Wix Dev Center - About Admin Operations",
        url: "https://dev.wix.com/docs/go-headless/develop-websites/project-guides/about-admin-operations",
      },
    ],
    publishDate: "2026-06-29T08:00:00.000Z",
  },
  {
    id: "accounting-erp-automation",
    title: "Back-office automation becomes the quiet moat for growing merchants",
    slug: "accounting-erp-automation",
    category: ["Cloud Ledger & Accounting Integrations", "Enterprise ERP Middleware"],
    group: "Back-Office & Operations",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_dadf06d0c87e4c4a81a2efe758fb5f15~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Merchants are asking platforms to sync orders, payments, taxes, invoices, refunds, and inventory into accounting and ERP systems automatically.",
    fullInsight:
      "A store can launch quickly and still fail operationally if finance and fulfillment are manual. The practical demand is real-time syncing between commerce events and systems like QuickBooks, Xero, NetSuite, SAP, and Microsoft Dynamics.\n\nThe important shift is event quality. Accounting integrations need order lifecycle events, tax breakdowns, payment states, refunds, discounts, fees, and inventory adjustments that reconcile cleanly without spreadsheet cleanup.",
    wixImpact:
      "This is especially important as Wix moves up-market with agencies and larger merchants. Strong back-office connectors reduce the perceived gap between Wix and enterprise commerce platforms.",
    recommendations: [
      "Treat order and payment event fidelity as a product requirement, not an integration detail.",
      "Make accounting connectors visible in commerce onboarding.",
      "Add operational health checks for failed syncs and unreconciled orders.",
    ],
    sources: [
      {
        label: "QuickBooks - Ecommerce integrations",
        url: "https://quickbooks.intuit.com/app/apps/category/e-commerce/",
      },
      {
        label: "Oracle NetSuite - Ecommerce ERP",
        url: "https://www.netsuite.com/portal/solutions/ecommerce.shtml",
      },
    ],
    publishDate: "2026-06-28T08:00:00.000Z",
  },
  {
    id: "developer-cli-ai-workflows",
    title: "Developer workflows converge around CLIs, local preview, and AI-readable project context",
    slug: "developer-cli-ai-workflows",
    category: ["Developer CLIs & Local IDE Workflows", "Cloud-Native Edge Runtimes"],
    group: "Developer Extensibility & Core",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_4f57f52377a54ea9a2002652362efcfb~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "The developer expectation is now local command flow plus AI context: scaffold, preview, build, release, and let agents inspect the project safely.",
    fullInsight:
      "Developer platforms are being judged by how well they work inside modern IDE and agent loops. CLIs, local previews, framework conventions, repo-readable instructions, typed SDKs, and deployable server functions are now part of the same experience.\n\nOpenAI's Agents SDK, MCP adoption, and Wix's own headless tooling all point to the same operating model: developers and agents need context-rich projects with repeatable commands and reliable backend execution.",
    wixImpact:
      "Wix Headless can make developers faster if the local loop is boring and predictable: generate, run, build, release, inspect logs, and provision CMS or business APIs. This is also what makes agentic development practical.",
    recommendations: [
      "Keep Wix CLI commands consistent across scaffold, build, preview, and release.",
      "Ship examples with AGENTS.md-style project instructions and clear local tasks.",
      "Make server API routes the standard bridge for privileged Wix operations.",
    ],
    sources: [
      {
        label: "OpenAI - New tools for building agents",
        url: "https://openai.com/index/new-tools-for-building-agents/",
      },
      {
        label: "Wix Dev Center - Go Headless",
        url: "https://dev.wix.com/docs/go-headless",
      },
    ],
    publishDate: "2026-06-27T08:00:00.000Z",
  },
  {
    id: "agency-workspaces-rbac",
    title: "Agency workspaces need RBAC and reusable libraries more than another template gallery",
    slug: "agency-workspaces-rbac",
    category: ["Multi-Tenant Studio & Agency Workspaces", "Service Provider Interfaces & Extensions"],
    group: "Developer Extensibility & Core",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_afc8ed206a8b418cbe57cbf3eec306d2~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Agencies managing many sites need roles, shared code, shared design systems, reusable extensions, and safe delegation across clients.",
    fullInsight:
      "As website builders move into agency and professional tiers, the product surface shifts from page creation to fleet management. Agencies need multi-site workspaces, RBAC, client-safe permissions, reusable components, design libraries, custom logic, and clean handoff.\n\nAI increases the need for governance. If agents can make site changes, agencies need clear role boundaries, approval workflows, audit logs, and reusable patterns that keep generated output on-brand.",
    wixImpact:
      "Wix Studio and Wix Headless can differentiate by treating agencies as operators of many sites, not just creators of individual pages. Governance and reuse are the features that make professional teams stay.",
    recommendations: [
      "Invest in shared libraries and role-scoped AI actions for agencies.",
      "Make approval and audit flows first-class for generated site changes.",
      "Connect Studio design systems to headless implementation patterns.",
    ],
    sources: [
      {
        label: "Wix Studio",
        url: "https://www.wix.com/studio",
      },
      {
        label: "Wix Dev Center",
        url: "https://dev.wix.com/docs",
      },
    ],
    publishDate: "2026-06-26T08:00:00.000Z",
  },
  {
    id: "identity-consent-data-residency",
    title: "Identity, consent, and data residency converge into one infrastructure decision",
    slug: "identity-consent-data-residency",
    category: ["Customer Identity & Access Management", "Privacy, Consent & Data Residency Compliance"],
    group: "Domains, Identity & Infrastructure",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_a64d7067618a490cb8c4de9f296a1b3b~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Unified login, consent capture, deletion workflows, and regional data expectations now sit directly in the launch path for serious sites.",
    fullInsight:
      "Customer identity is no longer just login. It now includes enterprise SSO, membership roles, consent state, customer deletion flows, region-specific policy, and data access controls across headless and native frontend surfaces.\n\nThe more composable the stack, the more identity becomes the glue. Merchants want one user, one consent state, one customer record, and consistent access rules even when the experience spans a site, mobile app, portal, and agent endpoint.",
    wixImpact:
      "Wix's advantage is one auth model across business solutions. The headless story should keep emphasizing that identity, members, CMS, commerce, and bookings do not need separate auth systems.",
    recommendations: [
      "Document identity patterns for multi-frontend headless sites.",
      "Keep consent and customer deletion flows tied to business-data APIs.",
      "Make member permissions easy to reason about for frontend and backend API routes.",
    ],
    sources: [
      {
        label: "Wix Dev Center - Go Headless",
        url: "https://dev.wix.com/docs/go-headless",
      },
      {
        label: "Auth0 - Customer identity",
        url: "https://auth0.com/customer-identity-access-management",
      },
    ],
    publishDate: "2026-06-25T08:00:00.000Z",
  },
  {
    id: "edge-performance-core-web-vitals",
    title: "Edge performance and Core Web Vitals remain the credibility test for generated sites",
    slug: "edge-performance-core-web-vitals",
    category: ["Edge Compute & Network Performance", "Domain Registry & Programmatic DNS Systems"],
    group: "Domains, Identity & Infrastructure",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_dd1edf1c82dc4654a3b83e541cca34e0~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "AI can generate sites quickly, but merchants still judge the platform on DNS, SSL, CDN, speed, uptime, and measurable Core Web Vitals.",
    fullInsight:
      "The AI builder race makes production infrastructure more important, not less. If a site is generated in minutes but loads slowly, breaks DNS, or fails SSL, the product promise collapses.\n\nThe operational baseline is now global CDN, automatic SSL, edge execution for server logic, reliable image optimization, and clear performance monitoring. These are invisible when they work and fatal when they fail.",
    wixImpact:
      "Wix should keep tying AI creation to production infrastructure. Harmony and headless can win against prompt-only tools by making the generated result fast, secure, deployed, and measurable immediately.",
    recommendations: [
      "Expose performance and SSL readiness in launch flows.",
      "Keep generated media optimized by default.",
      "Use Core Web Vitals as a trust proof for AI-generated output.",
    ],
    sources: [
      {
        label: "Google - Core Web Vitals",
        url: "https://web.dev/articles/vitals",
      },
      {
        label: "Cloudflare - Edge computing",
        url: "https://www.cloudflare.com/learning/serverless/glossary/what-is-edge-computing/",
      },
    ],
    publishDate: "2026-06-24T08:00:00.000Z",
  },
  {
    id: "unified-inventory-oms",
    title: "Unified inventory becomes the prerequisite for both omnichannel and AI commerce",
    slug: "unified-inventory-oms",
    category: ["Distributed Order Management Systems", "Shipping Broker APIs & Label Automation"],
    group: "Supply Chain & Logistics",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_19f7a30f438940b3bd5d8275a8fdf27f~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Retailers cannot safely expose stores to agents or marketplaces unless inventory, order routing, fulfillment, and shipping data are synchronized.",
    fullInsight:
      "Agentic and omnichannel commerce both punish fragmented operations. If inventory is stale, an AI agent may recommend an unavailable product; if fulfillment routing is weak, the merchant loses margin or trust.\n\nThe operational foundation is a distributed order model that knows inventory by location, routes orders intelligently, calculates shipping in real time, and keeps customer-facing availability aligned with warehouse reality.",
    wixImpact:
      "Wix merchants moving beyond simple stores need stronger inventory and shipping primitives. This is where Wix can partner, integrate, or build deeper order-management surfaces for larger sellers.",
    recommendations: [
      "Make inventory freshness visible in commerce dashboards and APIs.",
      "Expose shipping quote and label flows through backend-safe integrations.",
      "Treat agent-readable availability as a commerce data-quality requirement.",
    ],
    sources: [
      {
        label: "Shippo - Shipping API",
        url: "https://goshippo.com/api/",
      },
      {
        label: "Shopify - Inventory management",
        url: "https://www.shopify.com/retail/inventory-management",
      },
    ],
    publishDate: "2026-06-23T08:00:00.000Z",
  },
  {
    id: "supplier-network-automation",
    title: "Dropshipping and POD shift from catalog plugins to supplier-routing networks",
    slug: "supplier-network-automation",
    category: ["Dropshipping & Print-on-Demand Sourcing", "Distributed Order Management Systems"],
    group: "Supply Chain & Logistics",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_d27d33e3f1854cb99a9f9b1f1065f7c3~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Supplier catalogs, print-on-demand, inventory sync, order forwarding, and exception handling are becoming automated operating networks.",
    fullInsight:
      "Dropshipping and print-on-demand are no longer just app-store categories. Merchants expect supplier catalog import, inventory sync, variant mapping, automated order routing, shipment tracking, and error recovery.\n\nAs AI-generated stores proliferate, the bottleneck moves from storefront creation to fulfillment quality. It is easy to create a store; it is harder to reliably deliver the product.",
    wixImpact:
      "Wix can improve merchant outcomes by steering AI-generated commerce sites toward fulfillment-ready products, verified supplier integrations, and clear operational warnings before launch.",
    recommendations: [
      "Add fulfillment readiness checks to AI commerce setup.",
      "Promote verified supplier and POD integrations in generated store flows.",
      "Flag products with weak inventory sync or shipping reliability before publish.",
    ],
    sources: [
      {
        label: "Printful - Ecommerce integrations",
        url: "https://www.printful.com/integrations",
      },
      {
        label: "Printify - Wix integration",
        url: "https://printify.com/wix/",
      },
    ],
    publishDate: "2026-06-22T08:00:00.000Z",
  },
  {
    id: "geo-llmo-answer-engine-baseline",
    title: "GEO and LLMO become the new discovery baseline for merchant sites",
    slug: "geo-llmo-answer-engine-baseline",
    category: ["Generative Engine Optimization", "Structured Semantic Microdata & Technical SEO Diagnostics"],
    group: "Marketing & Discovery",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_0156d104f4a84843aaffbbe19015f881~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Search visibility is shifting from ranked links to AI answers, citations, summaries, product entities, and structured machine-readable content.",
    fullInsight:
      "Generative Engine Optimization is now a practical marketing discipline. The goal is not only ranking in blue links; it is being understood, cited, summarized, and selected by AI answer engines and shopping assistants.\n\nThe tactics are familiar but stricter: clean schema, entity clarity, strong product attributes, FAQs, original evidence, crawlable content, consistent business data, and content that answers specific buying questions directly.",
    wixImpact:
      "This maps directly to Wix's SEO and GEO positioning. Wix can turn complex AI-discovery work into defaults: schema, product feeds, FAQ blocks, llms.txt-style machine-readable summaries, and diagnostics inside the editor.",
    recommendations: [
      "Add AI-discovery checks beside classic SEO checks.",
      "Generate structured product and business facts by default.",
      "Track AI mentions and citations as a reporting surface for merchants.",
    ],
    sources: [
      {
        label: "Search Engine Land - GEO guide",
        url: "https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142",
      },
      {
        label: "Google Search Central - Structured data",
        url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
      },
    ],
    publishDate: "2026-06-21T08:00:00.000Z",
  },
  {
    id: "marketplace-feed-syndication",
    title: "Marketplace feed quality becomes the new growth lever for SMB commerce",
    slug: "marketplace-feed-syndication",
    category: ["Omnichannel Marketplace Syndication & Feed Mapping", "Real-Time Lifecycle CRM Data Synchronization"],
    group: "Marketing & Discovery",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_bb93c8275c784883a50e1db11e3923dd~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "TikTok Shop, Meta Commerce, Google, Amazon, and AI shopping surfaces all depend on accurate product feeds and event feedback loops.",
    fullInsight:
      "Merchants increasingly sell wherever demand appears: social commerce, marketplaces, ads, AI answer engines, and direct storefronts. That makes product-feed quality a revenue lever: titles, variants, availability, shipping, images, pricing, taxonomy, policy, and promotional data must stay synchronized.\n\nThe next layer is feedback: lifecycle events and conversion data must flow back to CRM and marketing platforms so campaigns optimize on real outcomes.",
    wixImpact:
      "Wix can help SMBs behave like larger retailers by automating feed mapping and lifecycle sync. The less a merchant has to understand each channel's schema, the more likely they are to expand GMV through Wix-managed commerce.",
    recommendations: [
      "Make feed health a visible commerce metric.",
      "Map product data once and syndicate to multiple channels.",
      "Sync abandoned checkout, purchase, and refund events to CRM tools in real time.",
    ],
    sources: [
      {
        label: "Meta - Commerce Manager catalog docs",
        url: "https://www.facebook.com/business/help/1275400645914358",
      },
      {
        label: "Google Merchant Center - Product data specification",
        url: "https://support.google.com/merchants/answer/7052112",
      },
    ],
    publishDate: "2026-06-20T08:00:00.000Z",
  },
  {
    id: "first-party-telemetry-server-side",
    title: "First-party telemetry and server-side tracking become the analytics control plane",
    slug: "first-party-telemetry-server-side",
    category: ["First-Party Behavioral Telemetry", "Data Warehousing & Data Pipelines"],
    group: "Analytics & Data Intelligence",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_9e8d20e21d384347bdf9cfe65c3008b9~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "Privacy pressure and signal loss are pushing sites toward first-party events, server-side collection, consent-aware pipelines, and warehouse exports.",
    fullInsight:
      "The analytics trend is not more dashboards; it is better control over event data. Privacy changes, browser limits, consent rules, and ad-platform signal loss make first-party behavioral telemetry and server-side collection more important.\n\nFor commerce, the critical events are product views, search, cart, checkout step, payment attempt, purchase, refund, fulfillment, and repeat purchase. These need consent state, identity resolution, and reliable exports to warehouses or marketing systems.",
    wixImpact:
      "Wix has an opportunity to give SMBs enterprise-grade event quality without enterprise setup. Headless sites especially need one analytics model that works across custom frontends and Wix business systems.",
    recommendations: [
      "Standardize commerce events across native and headless frontends.",
      "Attach consent state to analytics events by default.",
      "Offer warehouse and CRM exports as growth-plan upgrades.",
    ],
    sources: [
      {
        label: "Segment - Customer Data Platform resources",
        url: "https://segment.com/resources/",
      },
      {
        label: "Google Analytics - Server-side tagging",
        url: "https://developers.google.com/tag-platform/tag-manager/server-side",
      },
    ],
    publishDate: "2026-06-19T08:00:00.000Z",
  },
  {
    id: "ai-ready-data-warehouse",
    title: "Data pipelines are being redesigned for AI agents, not just BI dashboards",
    slug: "ai-ready-data-warehouse",
    category: ["Data Warehousing & Data Pipelines", "First-Party Behavioral Telemetry"],
    group: "Analytics & Data Intelligence",
    image: {
      url: "https://static.wixstatic.com/media/1670a7_955203f9f0e9442ba6ab4ff080910baf~mv2.jpg",
      credit: { label: "Unsplash", url: "https://unsplash.com" },
    },
    snippet:
      "The next analytics stack must feed dashboards, lifecycle marketing, forecasting, and agents that can query operational data safely.",
    fullInsight:
      "Warehouses used to serve analysts. Now the same pipelines must serve marketing automation, forecasting, support, finance, and AI agents that ask operational questions in natural language.\n\nThat changes the quality bar: event schemas need stable IDs, timestamps, consent, source, actor, and business context. Agents cannot safely answer 'why did sales drop?' or 'which orders are stuck?' if the platform does not expose clean, governed operational data.",
    wixImpact:
      "Wix can make data readiness a platform feature. If merchants can safely export and query commerce, bookings, CRM, and CMS events, Wix becomes a stronger operating system for AI-assisted businesses.",
    recommendations: [
      "Create canonical event schemas for Wix business solutions.",
      "Expose governed read paths for analytics agents.",
      "Prioritize operational questions, not only marketing dashboards.",
    ],
    sources: [
      {
        label: "BigQuery - Data warehouse",
        url: "https://cloud.google.com/bigquery",
      },
      {
        label: "Snowflake - Data Cloud",
        url: "https://www.snowflake.com/en/data-cloud/",
      },
    ],
    publishDate: "2026-06-18T08:00:00.000Z",
  },
  ...additionalTrends,
];

# APEX Drive

> **Live Site:** [www.apex-drive.co](https://www.apex-drive.co/)

A cinematic supercar driving experience storefront — book a session behind the wheel of a specific car on a specific circuit at a specific time. The site features a full-viewport scroll-driven hero, live Wix Bookings session catalog, real availability and checkout, and an AI pit-wall concierge powered by Claude.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (server output) + React islands
- **Wix Integration:** Wix Managed Headless — hosted and deployed via the Wix CLI
- **Wix Business Solutions:**
  - [Wix Bookings](https://dev.wix.com/docs/sdk/api-reference/bookings/introduction) — driving session catalog, availability, and checkout
  - [Wix eCommerce](https://dev.wix.com/docs/rest/business-solutions/e-commerce/introduction) + [Wix Redirects](https://dev.wix.com/docs/sdk/api-reference/redirects/introduction) — cart and hosted checkout
  - [Wix Data](https://dev.wix.com/docs/sdk/api-reference/data/introduction) — FAQ content (Ricos rich text)
  - [Wix Forms](https://dev.wix.com/docs/sdk/api-reference/forms/introduction) — contact flows
- **Styling:** Tailwind CSS v4 + custom fluid-scroll design system
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix build` / `wix release`)

## Project Structure

```
apex-drive/
├── public/                         # Static assets, edge-cache CSS pins, hero poster
├── src/
│   ├── components/
│   │   ├── HeroFluid.astro         # Full-viewport hero with lap film
│   │   ├── GhostLap.astro          # Pinned fleet scroll sequence
│   │   ├── Concierge.tsx           # AI pit-wall chat widget
│   │   ├── ServiceBookingFlow.tsx  # Bookings calendar + checkout
│   │   ├── TourBooking.tsx         # (booking flow components)
│   │   └── ...
│   ├── data/
│   │   └── fleetFilms.ts           # Fleet video/image metadata
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro             # Home — hero, fleet, live sessions
│   │   ├── services/               # Session catalog + detail pages
│   │   ├── about.astro
│   │   ├── faq.astro
│   │   ├── agents.astro            # MCP agent demo page
│   │   ├── booking-confirmation.astro
│   │   ├── llms.txt.ts             # LLM-readable site summary
│   │   └── api/
│   │       ├── concierge.ts        # Claude AI concierge (SSE)
│   │       └── grid-pass.ics.ts    # Calendar pass download
│   ├── scripts/
│   │   └── fluid.ts                # Scroll-driven motion controller
│   ├── styles/
│   │   └── global.css              # Design tokens + fluid layout
│   └── utils/
│       ├── ssr-cache.ts            # In-memory SSR response cache
│       └── wix-image.ts            # Wix Media URL helpers
├── astro.config.mjs
├── package.json
├── .env.example                    # ANTHROPIC_API_KEY for concierge (optional)
└── wix.config.example.json         # Reference only — generated locally by init
```

## How to Create This Yourself

### Prerequisites

- Node.js v20.11.0+
- A [Wix account](https://manage.wix.com)
- [Wix CLI](https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli) — install globally or use via `npx`:
  ```bash
  npm install -g @wix/cli
  ```

---

### Option A: Download & Run This Project

> **Important:** All commands below must be run from inside the `apex-drive/` folder, **not** the monorepo root.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set apex-drive
   cd apex-drive
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Log in and connect to your own Wix site:**
   ```bash
   wix login
   npm create @wix/new@latest init
   ```
   This provisions a **new** Wix site and writes a local `wix.config.json` (gitignored).

   > **Do not run `wix init`** — that command does not exist. Use `npm create @wix/new@latest init`.

4. **Update `site` in `astro.config.mjs`** to your production URL (used for SEO, sitemap, and the concierge MCP endpoint).

5. **Install Wix Bookings** from the [App Market](https://www.wix.com/app-market) and create driving session services. See [Dashboard setup](#dashboard-setup) below.

6. **(Optional) Enable the AI concierge:**
   ```bash
   cp .env.example .env.local
   ```
   Add your Anthropic API key, or set it in production:
   ```bash
   wix env set --key ANTHROPIC_API_KEY --value <your-key>
   wix env pull
   ```
   Without a key, the concierge shows a friendly "off the air" message — the rest of the site works normally.

7. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321).

8. **Build and deploy:**
   ```bash
   npm run build
   npm run release
   ```

---

### Option B: Build It From Scratch

1. **Create a new Wix Managed Headless project:**
   ```bash
   npm create @wix/new@latest -- headless
   ```

2. **Install Wix SDK packages:**
   ```bash
   npm install @wix/bookings @wix/data @wix/forms @wix/redirects @wix/essentials @anthropic-ai/sdk
   ```

3. **Configure Astro** with `@wix/astro`, `@wix/astro-pages`, `output: "server"`, and Tailwind v4.

4. **Wire Bookings** for session catalog, availability calendar, and checkout redirect flow.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

### Dashboard setup

| What | Where | Details |
|------|-------|---------|
| **Wix Bookings** | App Market | Create driving session services (e.g. track experiences). Each service needs a URL slug, duration, and pricing. The home page and `/services` query these live. |
| **Bookings checkout** | Bookings settings | Enable online booking and payment for hosted checkout on the booking flow. |
| **Wix CMS** | App Market | Optional — powers FAQ rich-text content if you wire CMS collections. |
| **OAuth / MCP** | Headless Settings | If using the AI concierge, ensure your site's MCP endpoint is accessible at `/_api/mcp` and add your production URL to allowed redirect URIs. |
| **Anthropic API key** | `wix env set` or `.env.local` | Optional — powers `/api/concierge` Claude chat. Site works without it. |

Fleet imagery and hero video are served from **Wix Media** (not committed to the repo). Upload your media in the Wix dashboard and reference URLs in `src/data/fleetFilms.ts`.

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

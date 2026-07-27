# Bus Conversions

> **Live Site:** [www.busconversions.net](https://www.busconversions.net/)

A Portland-based bus conversion studio storefront — retired city buses turned into rolling homes. Visitors can explore build packages, browse finished conversions, walk through the 7-stage build process, configure a custom build, and book an open-build Saturday tour via Wix Bookings.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (server output) + React islands
- **Wix Integration:** Wix Managed Headless — hosted and deployed via the Wix CLI
- **Wix Business Solutions:**
  - [Wix Bookings](https://dev.wix.com/docs/sdk/api-reference/bookings/introduction) — open-build Saturday tour scheduling with real availability and checkout
  - [Wix Data](https://dev.wix.com/docs/sdk/api-reference/data/introduction) — `FinishedBuilds`, `Reviews`, and `StoryBlocks` CMS collections
  - [Wix eCommerce](https://dev.wix.com/docs/rest/business-solutions/e-commerce/introduction) + [Wix Redirects](https://dev.wix.com/docs/sdk/api-reference/redirects/introduction) — booking checkout flow
- **Styling:** Tailwind CSS v4 + custom design tokens (olive, destination-sign lime, navy-teal)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix build` / `wix release`)

## Project Structure

```
bus-conversions/
├── public/                         # Static assets (favicon)
├── src/
│   ├── assets/                     # Build renders, interior models, hero art
│   ├── components/
│   │   ├── BuildConfigurator.tsx   # Interactive package customizer
│   │   ├── FloorPlanViewer.tsx     # Interactive floor-plan viewer
│   │   ├── RollSign.tsx            # Split-flap destination sign animation
│   │   ├── TourBooking.tsx         # Wix Bookings tour scheduler
│   │   └── ...                     # Nav, footer, grids, timeline, etc.
│   ├── data/
│   │   └── site.ts                 # Static content fallback (single source of truth)
│   ├── layouts/
│   │   └── Layout.astro            # Shared layout, SEO JSON-LD
│   ├── lib/
│   │   └── cms.ts                  # Wix Data queries with static fallback
│   ├── pages/
│   │   ├── index.astro             # Home
│   │   ├── packages.astro          # Build levels + configurator
│   │   ├── builds.astro            # Portfolio + floor plans
│   │   ├── process.astro           # 7-stage timeline
│   │   ├── visit.astro             # Book a tour
│   │   ├── about.astro             # The Shop
│   │   ├── faq.astro               # FAQ with JSON-LD
│   │   ├── confirmation.astro      # Post-booking confirmation
│   │   └── api/
│   │       └── seed.ts             # One-time CMS collection seeder
│   ├── scripts/
│   │   └── motion.ts               # Lenis smooth scroll + reveal animations
│   └── styles/
│       └── global.css              # Tailwind v4 theme tokens
├── astro.config.mjs
├── package.json
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

> **Important:** All commands below must be run from inside the `bus-conversions/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set bus-conversions
   cd bus-conversions
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific, gitignored — not committed to this repo). The business name is derived from the folder name.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

4. **Install required Wix Business Solutions** on your new site from the [App Market](https://www.wix.com/app-market):
   - **Wix Bookings**
   - **Wix CMS** (Content Manager)

   See [Dashboard setup](#dashboard-setup) below for service and collection configuration.

5. **Seed the CMS collections** (one-time, with `npm run dev` running):
   ```bash
   curl http://localhost:4321/api/seed
   ```
   This creates `FinishedBuilds`, `Reviews`, and `StoryBlocks` collections and loads content from `src/data/site.ts`. You can delete `src/pages/api/seed.ts` after seeding.

6. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321).

7. **Build and deploy:**
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
   Follow the prompts. For a bookings-focused site, choose an appropriate template.

2. **Install additional Wix packages:**
   ```bash
   npm install @wix/bookings @wix/data @wix/ecom @wix/redirects @wix/essentials
   ```

3. **Configure Astro** with `@wix/astro`, `@wix/astro-pages`, `output: "server"`, and Tailwind v4.

4. **Wire up Bookings** for tour scheduling (`availabilityCalendar`, `bookings.createBooking`) and **Wix Data** for CMS-backed content with static fallbacks.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

### Dashboard setup

After linking your site, configure the following in [manage.wix.com](https://manage.wix.com):

| What | Where | Details |
|------|-------|---------|
| **Wix Bookings** | App Market | Create a service (e.g. "Open-Build Saturday Tour"). Set working hours to **Saturday 10:00–14:00, America/Los_Angeles** for Portland-style Saturday tours. The `/visit` page queries live availability and creates real bookings. |
| **Wix CMS** | App Market | Required before running `/api/seed`. Creates `FinishedBuilds`, `Reviews`, and `StoryBlocks` collections. Until seeded, all pages render from static fallback data in `src/data/site.ts`. |
| **Bookings checkout** | Bookings settings | Enable online booking and payment if you want the full checkout flow on `/confirmation`. |

The site is fully populated from static data even before CMS seeding — seeding makes content editable in the Wix dashboard.

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

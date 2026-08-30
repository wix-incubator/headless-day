# Salt Meridian

> **Live Site:** [www.thesaltmeridian.com](https://www.thesaltmeridian.com/)

A 30-seat driftwood asador above the harbor in San Sebastián — chalkboard menu, today's catch banner, gallery, and a table-request form. Visitors send a reservation inquiry; the kitchen confirms by phone.

## Technologies

- **Framework:** Astro 5 (server output) + React islands
- **Wix Integration:** Wix Managed Headless — menu, reviews, story, today's catch, and reservation inquiries all go through **Wix CMS (Data)** (`items.query` / `items.insert` on collections). Reservation is an inquiry collection, not Wix Bookings.
- **Styling:** Tailwind CSS v4 + custom asador tokens
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
salt-meridian/
├── public/fonts/              # Optional self-hosted fonts (gitignored binaries)
├── scripts/
│   ├── seed-cms.mjs           # Bootstrap CMS collections from local seed data
│   └── generate-images.mjs    # Optional Wix Media image generation
├── src/
│   ├── pages/                 # / /menu /about /reservations /gallery /contact
│   ├── layouts/               # BaseLayout — SEO, nav, footer, mobile sticky bar
│   ├── components/
│   │   └── islands/           # ReservationForm, TodaysCatchBanner, map facade
│   ├── lib/                   # cms.ts (Wix Data + seed fallback), images, site
│   ├── data/content.ts        # Local seed that mirrors CMS collections
│   └── styles/
├── .env.local.example         # Placeholder env vars (copy to .env.local)
├── wix.config.json            # Placeholder appId / siteId — run `init` locally
└── package.json
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

> **Important:** All commands below must be run from inside the `salt-meridian/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set salt-meridian
   cd salt-meridian
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific — replace the `YOUR_APP_ID_HERE` / `YOUR_SITE_ID_HERE` placeholders). The business name is derived from the folder name.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Copy env placeholders and add your OAuth client ID:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `WIX_CLIENT_ID` from **Dashboard → Settings → Headless Settings → OAuth apps**. Leave `WIX_API_KEY` / `WIX_SITE_ID` blank until you seed CMS.

5. **Create the Wix CMS collections** in **Dashboard → CMS → Collections**. Field ids must match exactly.

   **`BoardDish`** — the menu (≥ 8 rows)

   | Field id | Type | Notes |
   |---|---|---|
   | `name` | Text | Dish name |
   | `section` | Text | From the Sea, From the Fire, From the Garden, To Drink, To Finish |
   | `price` | Text | e.g. `€58 / kg` |
   | `catchTag` | Text | `Today's Catch`, `Signature`, or empty |
   | `tastingDescription` | Text (long) | Short description |
   | `image` | Text | Image key (`hero`, `txuleta`, `grillBars`, …) |
   | `order` | Number | Sort order within section |

   **`Review`** — homepage quotes (3 rows): `name`, `quote`, `detail`

   **`StoryBlock`** — The Fire page (1 row): `heading`, `body`

   **`TodaysCatch`** — live banner (1 row): `heading`, `body`, `updatedLabel`

   **`Reservations`** — table-request form target: `name`, `phone`, `date`, `partySize`, `seatingPreference`, `note`, `status`

   Set **`Reservations`** so **Anyone** can *add* items (the form submits as a site visitor). Keep the content collections admin-managed.

   Then seed from local content:
   ```bash
   WIX_API_KEY=YOUR_API_KEY_HERE  WIX_SITE_ID=YOUR_SITE_ID_HERE  npm run seed
   ```

6. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)). CMS reads fall back to `src/data/content.ts` if collections are empty.

   To preview the UI with no Wix credentials: `npm run build:static && npx astro preview --config astro.config.verify.mjs`.

7. **Build and deploy:**
   ```bash
   npm run build
   npm run release
   ```
   Your site will be live on Wix's infrastructure under your site's domain.

---

### Option B: Build It From Scratch

1. **Create a new Wix Managed Headless project:**
   ```bash
   npm create @wix/new@latest -- headless
   ```
   Follow the prompts for business name, folder name, and site template.

2. **Install additional Wix packages** as needed (`@wix/data`, `@wix/sdk`).

3. **Configure Astro** with `@wix/astro`, `output: "server"`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix CMS (Data)** for menu, catch banner, and reservation inquiries (`items.query` / `items.insert`). Create the collections listed above.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

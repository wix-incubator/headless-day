# Parallel Parking Stadium

> **Live Site:** [www.parallelparkingstadium.com](https://www.parallelparkingstadium.com/)

Competitive parking as a spectator sport — a Buenos Aires arena with weekly tournaments, a hi-score board, hall of fame, ticket holds, and a playable 1990s arcade parallel-parking mini-game.

## Technologies

- **Framework:** Astro 5 (server output) + React islands
- **Wix Integration:** Wix Managed Headless — **Wix CMS (Data)** for tournaments, competitors, legends, testimonials, and ticket-hold inserts (`Bookings` collection). Ticket checkout is a CMS hold, not Wix Bookings or Events checkout.
- **Styling:** Custom CRT/arcade CSS (Pixelify Sans, Press Start 2P, VT323, Silkscreen)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
parallel-parking-stadium/
├── data/cms/                    # CSV seed for CMS import
├── scripts/seed-cms.mjs         # Programmatic CMS seed
├── src/
│   ├── pages/                   # / tournaments rankings hall-of-fame tickets about visit play
│   │   └── api/book.ts          # Ticket hold → Wix Data Bookings insert
│   ├── components/
│   │   ├── ParkingGame.tsx      # Arcade mini-game
│   │   ├── TicketCheckout.tsx
│   │   └── …
│   ├── data/seed.ts             # Local fallback when CMS is empty
│   ├── lib/content.ts           # Wix Data queries + seed fallback
│   └── styles/global.css
├── .env.local.example           # Placeholder env vars
├── wix.config.json              # Placeholder appId / siteId — run `init` locally
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

> **Important:** All commands below must be run from inside the `parallel-parking-stadium/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

Use **npm** (not pnpm): `wix build` / `wix release` reject pnpm. If `npm install` fails on peer deps, use `npm install --legacy-peer-deps`.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set parallel-parking-stadium
   cd parallel-parking-stadium
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
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
   Fill in `PUBLIC_WIX_CLIENT_ID` from **Dashboard → Settings → Headless Settings → OAuth apps**. Without it, pages fall back to local seed data and ticket holds are simulated.

5. **Create the Wix CMS collections** in **Dashboard → CMS**. Field ids must match exactly. Set **Anyone can read** on the first four; set **Anyone can add** on `Bookings`.

   - **`Tournaments`** — `tournamentId`, `title`, `date`, `isoDate`, `time`, `format`, `bracket` (Text); `seatsRemaining` (Number); `status` (Text); `headlineMatchup` (Text)
   - **`Competitors`** — `rank`, `margin`, `clean`, `touches`, `pts` (Number); `name`, `note` (Text)
   - **`LegendaryParks`** — `no`, `driver`, `car`, `space`, `story` (Text); `clearance`, `year` (Number)
   - **`Testimonials`** — `name`, `quote`, `detail` (Text)
   - **`Bookings`** — `name`, `email`, `tournamentId`, `tournamentTitle`, `seatingTier`, `status`, `createdAt` (Text); `quantity`, `total` (Number)

   Then seed from the CSVs in `data/cms/` (collection → Import from CSV) or:
   ```bash
   WIX_API_KEY=YOUR_API_KEY_HERE  WIX_SITE_ID=YOUR_SITE_ID_HERE  npm run seed
   ```

6. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

7. **Build and deploy:**
   ```bash
   npm run build
   npm run release
   ```
   Run these through npm (`npm run …`) so the Wix CLI sees the package manager. Your site will be live on Wix's infrastructure under your site's domain.

---

### Option B: Build It From Scratch

1. **Create a new Wix Managed Headless project:**
   ```bash
   npm create @wix/new@latest -- headless
   ```
   Follow the prompts for business name, folder name, and site template.

2. **Install additional Wix packages** as needed (`@wix/data`, `@wix/sdk`).

3. **Configure Astro** with `@wix/astro`, `output: "server"`, and `@wix/cloud-provider-fetch-adapter`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix CMS (Data)** for tournament content and ticket-hold inserts.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

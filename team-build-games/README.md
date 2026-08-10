# Team Build Games

> **Live Site:** [teambuildgames.net](https://www.teambuildgames.net/)

The office arcade — tiny browser multiplayer games for team calls. Open a room, share one link, and play Arena PvP, Overrun, Squid, or Road Madness with up to eight coworkers. Sign in to vote on the next game, upload a player avatar, and check out merch from the trophy shop.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (server output) + React islands
- **Games:** Phaser 4 + Trystero WebRTC (P2P rooms) with optional Wix Realtime signaling
- **Wix Integration:** Wix Managed Headless — hosted and deployed via the Wix CLI
- **Wix Business Solutions:**
  - [Wix CMS (Data)](https://dev.wix.com/docs/sdk/api-reference/data/introduction) — game catalog, likes, pitches, scores, merch orders, arena skins
  - [Wix Members](https://dev.wix.com/docs/sdk/api-reference/members/introduction) — sign-in, avatars, owned skins
  - [Wix Media](https://dev.wix.com/docs/sdk/api-reference/media/introduction) — avatar uploads, hosted game audio assets
  - [Wix Realtime](https://dev.wix.com/docs/sdk/api-reference/realtime/introduction) — multiplayer signaling (`/api/signal`, `/api/rt-publish`)
  - [Wix Stores](https://dev.wix.com/docs/sdk/api-reference/stores/introduction) + [Wix eCommerce](https://dev.wix.com/docs/rest/business-solutions/e-commerce/introduction) — Score Tee merch, arena skin products, hosted checkout
  - [Wix Redirects](https://dev.wix.com/docs/sdk/api-reference/redirects/introduction) — checkout redirect sessions
  - [Wix SEO](https://dev.wix.com/docs/sdk/api-reference/seo/introduction) — product and collection pages
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix build` / `wix release`)

## Project Structure

```
team-build-games/
├── public/                 # Favicons, game screenshots, static assets
├── src/
│   ├── components/         # Layout, merch UI, game cabinets, like buttons
│   ├── game/               # Arena, Overrun, Squid, Road Madness (Phaser + net)
│   ├── lib/wix/            # Stores cart, checkout, CMS helpers, members
│   ├── pages/
│   │   ├── games/          # Per-game lobby and play pages
│   │   ├── shop/           # Merch product + checkout flow
│   │   └── api/            # Likes, avatars, checkout, signaling, scores
│   └── styles/
├── scripts/                # Optional Wix CLI helpers (e.g. arena skin products)
├── docs/                   # Internal game and integration notes
├── .env.example            # TURN relay, arena skin product IDs, media URLs
└── wix.config.json # Reference only — generated locally via init
```

## How to Create This Yourself

### Prerequisites

- Node.js v20.11.0+ (project targets Node 24.x)
- A [Wix account](https://manage.wix.com)
- [Wix CLI](https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli):

```bash
npm install -g @wix/cli
```

---

### Option A: Download & Run This Project

> **Important:** All commands below must be run from inside the `team-build-games/` folder, **not** the monorepo root.

1. **Sparse-clone just this folder** from the monorepo:

```bash
git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
cd headless-day
git sparse-checkout set team-build-games
cd team-build-games
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

This provisions a new Wix site and writes a local `wix.config.json` (gitignored). **Do not run `wix init`** — that command does not exist.

4. **Install Wix apps** on your site: **Wix Stores**, **Wix Members**, and seed CMS collections / products as needed. Copy `.env.example` to `.env.local` and set TURN credentials for cross-device WebRTC play (see comments in `.env.example`).

5. **Run locally:**

```bash
npm run dev
```

6. **Build and deploy:**

```bash
npm run build
npm run release
```

---

### Option B: Build It From Scratch

1. Create a Wix Managed Headless project: `npm create @wix/new@latest -- headless`
2. Add Astro 5 + `@wix/astro`, `@wix/astro-pages`, Tailwind, Phaser, and Trystero
3. Wire **Members** for auth, **Data** for game metadata and likes, **Stores/eCommerce** for merch checkout, **Realtime** for signaling
4. Deploy with `wix release`

See [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repository is encouraged, but is done on the responsibility of the user.

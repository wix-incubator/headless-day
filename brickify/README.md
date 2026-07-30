# Brickify

Design custom brick models in a browser-based 3D builder, then check out a real
bill-of-materials pack of brick-compatible parts via **Wix Stores** and hosted checkout.

**Live site:** https://headless-d-796da767-dmytroh0.wix-site-host.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Part catalogue & variants | **Wix Stores** — one product per part type, colour swatch variants |
| Cart & checkout | **Wix eCommerce** — BOM → `addToCurrentCart` → hosted checkout |
| Site hosting | **Wix Managed Headless** (`@wix/astro`, `wix release`) |

## Pages

- `/` — landing page with deferred Three.js hero + part showcase
- `/builder` — 3D brick editor (snap grid, 50 part types, 28 colours, live BOM)
- `/api/checkout` — maps BOM lines to catalog products/variants, creates checkout redirect
- `/api/seed-catalog` — optional one-time catalog seeder (gated by `BRICKIFY_SEED_KEY`)

## Run locally

> All commands below must be run from inside the `brickify/` folder, not the monorepo root.

```bash
npm install
npx @wix/cli login
npm create @wix/new@latest init
npm run dev                    # wix dev → http://localhost:4321
```

Install **Wix Stores** on your site and seed the part catalogue (see `DEPLOY-AND-STORES.md` and `/api/seed-catalog`).

## Build & deploy

```bash
npm run build      # wix build
npm run release    # publish to Wix hosting
```

## Stack

- **Astro 5** (SSR) + React islands
- **`@wix/astro`** — Wix-managed hosting
- **`@wix/stores`**, **`@wix/ecom`**, **`@wix/redirects`** — catalog, cart, checkout
- **Three.js** — 3D builder and landing hero (deferred for performance)

See also: [`DEPLOY-AND-STORES.md`](./DEPLOY-AND-STORES.md), [`BRICKIFY-research.md`](./BRICKIFY-research.md).

---

> **Disclaimer:** Brickify is an independent product and is not affiliated with, sponsored by, or endorsed by the LEGO Group. This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repository is encouraged, but is done entirely at the responsibility of the user.

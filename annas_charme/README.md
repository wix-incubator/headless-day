# Anna's Charme — Wix Headless fashion storefront

A full-featured fashion e-commerce storefront built on **Wix Headless** (Astro, Wix-managed hosting). Product browsing, search, collections filtering, cart, and Wix-hosted checkout — all powered by Wix Stores and the Wix SDK.

**Live site:** https://annas-char-8f70878b-annaa76.wix-site-host.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Product catalogue & collections | **Wix Stores** (Catalog V3) |
| Search & filtering | **Wix Search** + collection facets |
| Cart management | **Wix eCommerce** — `currentCart` API |
| Checkout | **Wix eCommerce** hosted checkout + `@wix/redirects` |
| Product recommendations | Wix recommendation algorithm |
| Media / images | **Wix Media** — optimised delivery via SDK |

## Pages

- `/` — hero + featured product grid
- `/search` — full product search with collection and sort filters
- `/search/[collection]` — filtered collection view
- `/product/[slug]` — product detail: images, variants, add-to-cart, related items
- Cart — slide-over modal, quantity editing, checkout redirect

## Run locally

```bash
npm install
npm run dev    # wix dev → http://localhost:4321
```

Requires a logged-in Wix CLI session:
```bash
npx @wix/cli login
```

Then initialise your own Wix site:
```bash
npm create @wix/new@latest init
```

This generates `wix.config.json` (git-ignored) with your `appId` and `siteId`. Install **Wix Stores** from the dashboard to populate the catalogue.

## Build & deploy

```bash
npm run build      # wix build
npm run release    # publish to Wix hosting
```

## Stack

- **Astro 5** — SSR pages and Astro Actions
- **`@wix/astro`** — Wix-managed hosting integration
- **`@wix/stores`**, **`@wix/ecom`**, **`@wix/search`**, **`@wix/media`** — Wix SDK modules
- **Tailwind CSS** — utility styling

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

# Uncle Johny's Tombstones

🔗 Live site: [https://www.uncle-johny-tombstones.com/](https://www.uncle-johny-tombstones.com/)

A horror-themed tombstone shop built with [Astro](https://astro.build) on [Wix Managed Headless](https://dev.wix.com/docs/go-headless). Browse the catalogue, add a tombstone to your cart, and check out through a Wix-hosted checkout — complete with an ambient soundtrack and a suitably grim success/failure flow.

## Stack

- [Astro](https://astro.build) (server output) + React for interactive islands
- [Wix Headless](https://dev.wix.com/docs/go-headless) — Wix Stores (catalogue/cart) and Wix eCommerce (checkout redirects)
- Deployed via the Wix CLI (`wix build` / `wix release`)

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. Connect the project to your own Wix site with the [Wix CLI](https://dev.wix.com/docs/go-headless) (this generates a local `wix.config.json` — intentionally not included/committed here, since it's specific to a single site):
   ```
   wix init
   ```
3. Run the local dev server:
   ```
   npm run dev
   ```
4. Build and release:
   ```
   npm run build
   npm run release
   ```

## Project structure

- `src/pages` — routes: landing page, `/shop`, `/product/[id]`, `/api/cart`, `/api/checkout`, `/success`, `/failure`
- `src/lib/shop.ts` — server-side helpers for reading the Wix Stores catalogue
- `src/components`, `src/layouts` — page sections and shared layout

---

**Disclaimer:** This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

# Sunny Side — breakfast, city by city

A warm, editorial breakfast guide to the cities where Wix has offices —
**Tel Aviv, Kyiv, Kraków, Dublin, Miami, Vilnius, and São Paulo**. Every city
guide is free to browse with two hand-picked spots; a one-time **All-Access Pass
($9)** unlocks the full guides plus a downloadable **Breakfast Passport**.

Built on **Wix Headless** (managed) with **Astro**.

**Live site:** https://www.yoursunnyside.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| City guides (7 cities, hero + free spots + premium content) | **Wix CMS** (`Cities` collection) |
| The $9 digital All-Access Pass (single SKU, digital download) | **Wix Stores** (Catalog V3, digital product) |
| Cart → checkout → payment | **Wix eCommerce** + **Wix Payments** (hosted checkout) |
| Breakfast Passport | Digital file attached to the product + `public/breakfast-passport.pdf` |
| Hero & city photography | Wix Media (AI-generated, served as optimized AVIF/WebP) |

## Pages

- `/` — hero, concept, featured-cities strip, Pass offer band
- `/cities` — responsive grid of all 7 city cards
- `/cities/[slug]` — CMS-driven guide: hero, intro, **2 free spots**, and a
  frosted **locked "Full Guide"** section that reveals on Pass ownership
- `/pass` — sales page → Wix checkout
- `/thank-you` — post-purchase unlock + Passport download
- `/about` — the concept and the Wix-cities story
- `/api/checkout` — backend route that builds the checkout (elevated) and returns a hosted-checkout redirect

## Architecture notes

- **CMS reads** use `@wix/data` (`items.query("Cities")`) from Astro SSR — public-read, no elevation.
- **Checkout** is created server-side in `src/pages/api/checkout.ts` via `checkout.createCheckout` wrapped in `auth.elevate`, then `@wix/redirects` produces the hosted-checkout URL (the `https` origin is passed from the client to satisfy the redirect allowlist).
- **Pass ownership** is a client-side unlock for this demo: `/thank-you?purchased=1` sets a flag that reveals the locked sections site-wide.
- **Images** are Wix Media URLs resolved through `media.getScaledToFillImageUrl` for sized, compressed delivery.

## Develop

```bash
npm install --no-optional   # sharp is optional and unused (remote images only)
npm run dev                 # wix dev
npm run build               # wix build
npm run release             # wix release
```

Requires a logged-in Wix CLI session (`npx @wix/cli login`). Environment
credentials live in `.env.local` (git-ignored) and are managed by the Wix CLI.

## Payments

The checkout flow is fully wired end-to-end. To accept live payments, connect a
payment provider (e.g. **Wix Payments**) once in the site dashboard →
**Accept Payments**. No code change is needed afterward.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

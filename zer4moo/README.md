# Zer4moo — flower bouquet builder & delivery

A whimsical flower delivery storefront where customers build a custom bouquet stem by stem, browse a "herd" of named cows, and check out via Wix-hosted payment. Built on **Wix Headless** (managed) with **Astro + React**.

**Live site:** https://www.zer4moo.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Flower/stem catalogue | **Wix CMS** (`stems` collection) |
| Bouquet orders & checkout | **Wix Stores** + **Wix eCommerce** (hosted checkout) |
| Cow herd profiles | **Wix CMS** (`herd` collection) |
| Order confirmation | `src/pages/delivered.astro` — post-purchase page |
| Booking / inquiry API | `src/pages/api/order.ts` |

## Pages

- `/` — hero meadow scene + bouquet builder
- `/shop` — browse all available stems
- `/cart` — cart review before checkout
- `/herd` — meet the cows (CMS-driven grid)
- `/herd/[slug]` — individual cow profile page
- `/about` — the concept
- `/delivered` — post-purchase confirmation

## Run locally

```bash
npm install
npm run dev    # wix dev → http://localhost:4321
```

Requires a logged-in Wix CLI session:
```bash
npx @wix/cli login
```

Then run `npm create @wix/new@latest init` in this folder to connect your own Wix site and generate `wix.config.json`.

## Seed data

A seed script populates the CMS collections. Set your site credentials and run:

```bash
export WIX_SITE_ID=your-site-id
node scripts/seed.mjs
```

The script reads a bearer token from `/tmp/wix_token.txt` — generate one with `npx @wix/cli token`.

## Stack

- **Astro 5** — SSR pages and API routes
- **React 18** — interactive components (BouquetBuilder, CartBadge, HerdLeaderboard)
- **Wix Headless** — CMS, Stores, eCommerce, managed hosting
- **`@wix/data`** — CMS queries for stems and herd

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

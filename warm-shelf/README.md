# Warm Shelf

A bookstore-café site — browse new titles, reserve free books from the community shelf, RSVP to author evenings, and design your own Ex Libris stamp before booking a craft session. Built on **Wix Managed Headless** (Astro + React).

**Live site:** https://soggz4-warm-shelf-01f52b97-tetianast.wix-site-host.com/

**Source:** https://github.com/TetianaStashchenko/warm-shelf

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Bookshop | **Wix Stores** — catalog, variants, add to cart |
| Shop checkout | **Wix eCommerce** — custom `/cart` page → `createCheckoutFromCurrentCart` → hosted Wix checkout |
| Craft sessions (Ex Libris, edge painting) | **Wix Bookings** — availability, booking form |
| Paid booking checkout | **Wix eCommerce** — booking cart → hosted checkout → `/booking-confirmation` |
| Author evenings & book club | **Wix Events** — RSVP |
| Free book-crossing shelf | **Wix CMS (Data)** — `BookCrossingShelf` collection |
| Shelf reservations | **Wix Forms** — reservation form via `/api/reserve` |
| Product / event / service SEO | **Wix SEO** |

The **Ex Libris studio** on the homepage is a client-side canvas tool — visitors design a stamp, download a PNG, then book a paid carving session.

## Run locally

> All commands below must be run from inside the `warm-shelf/` folder, not the monorepo root.

```bash
npm install
npx @wix/cli login
npm create @wix/new@latest init    # writes wix.config.json (git-ignored)
npm run dev                        # wix dev → http://localhost:4321
```

For server-side Wix API access during local dev, create `.env.local`:

```bash
WIX_API_KEY="your-wix-api-key"
WIX_SITE_ID="your-wix-site-id"
```

`WIX_ACCOUNT_ID` can be used instead of `WIX_SITE_ID` for account-scoped API keys.

After linking your own Wix site, recreate the **BookCrossingShelf** CMS collection and the shelf reservation form, then update the form ID in `src/pages/api/reserve.ts` if needed.

## Build & deploy

```bash
npm run build
npm run release
```

## Stack

- **Astro 5** (SSR) + **React 18** islands
- **`@wix/astro`** + **`@wix/astro-pages`** — managed hosting + platform routes
- **`@wix/stores`**, **`@wix/ecom`**, **`@wix/bookings`**, **`@wix/events`**, **`@wix/data`**, **`@wix/forms`**, **`@wix/seo`**

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

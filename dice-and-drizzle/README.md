# Dice & Drizzle

A board game café site for Reykjavik — book a table by the hour, browse 1,200+ games, shop merch, and RSVP to events. Built on **Wix Managed Headless** (Astro + React + Tailwind).

**Live site:** https://dice-drizz-f54fc80a-andriips.wix-site-host.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Table sessions | **Wix Bookings** — services, availability, booking flow |
| Paid bookings checkout | **Wix eCommerce** — Cart V2 + hosted checkout → `/booking-confirmation` |
| Merch shop | **Wix Stores** — catalog, add to cart, hosted checkout at `/checkout` |
| Game library, FAQ, about | **Wix CMS (Data)** |
| Café events | **Wix Events** |
| Stories & rules posts | **Wix Blog** |
| Contact & booking forms | **Wix Forms** |
| Membership | **Wix Pricing Plans** |

Checkout for both **shop** and **paid bookings** uses Wix's hosted `/checkout` page (wired via `@wix/astro-pages` + eCommerce redirects).

## Run locally

> All commands below must be run from inside the `dice-and-drizzle/` folder, not the monorepo root.

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

## Build & deploy

```bash
npm run build
npm run release
```

## Stack

- **Astro 5** (SSR) + **React 18** islands + **Tailwind CSS 4**
- **`@wix/astro`** + **`@wix/astro-pages`** — managed hosting + platform checkout/cart routes
- **`@wix/bookings`**, **`@wix/stores`**, **`@wix/events`**, **`@wix/blog`**, **`@wix/data`**, **`@wix/forms`**, **`@wix/pricing-plans`**

See also: [`DESIGN.md`](./DESIGN.md) for brand tokens.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

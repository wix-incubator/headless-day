# Vechornytsi — Build Spec

> A single-table supper club in a converted Dnipro-river boathouse, Kyiv. Twelve
> seats, a weekly-changing seven-course tasting menu built from what the chef
> forages. Reservations open 14 days ahead and sell out in minutes.

Built as a **Wix Headless** site (Astro SSR + `@wix/sdk`), deployed on Wix hosting.

## Art direction
- **Mood:** intimate · Nordic · refined · elemental — Ukrainian editorial restraint.
- **Type:** unified on **Hanken Grotesk** (nav, headings, body, buttons).
- **Palette:** warm off-white `#F5F0EB`, deep timber ink `#1A1F24`, brand slate `#2C3E50`, sage accent `#A3B18A`.
- **Imagery:** AI-generated candlelit-boathouse photography (hero, dinners, forage, products).

## Pages
| Page | Route | Source |
|---|---|---|
| Home | `/` | CMS + Stores |
| The Table | `/about` | CMS (Story) |
| Upcoming Dinners | `/events` | CMS (Dinners) + live availability + waitlist |
| Shop | `/products` · `/products/[slug]` · `/category/[slug]` | Wix Stores |
| Reserve | `/reserve/[slug]` | Stores (deposit/full seat) |
| Cart / Thank-you | `/cart` · `/thank-you` | Wix eCom + hosted checkout |
| Contact | `/contact` | Wix Forms → CRM |
| FAQ | `/faq` | CMS |
| My Account | `/account` | order-lookup stub |
| Legal | `/privacy` · `/terms` | static |

## Business solutions wired
- **Wix Stores + eCom** — 8 pantry/ceramics/voucher products + 16 reservation products (seat + 20% deposit), cart, hosted checkout.
- **Wix CMS (`@wix/data`)** — collections: `Dinners`, `Testimonials`, `Story`, `FaqItems`, `Waitlist`.
- **Wix Forms** — private-dining inquiry → CRM contact.

## Notable decisions
- **Reservations as ticketed seats** — each dinner is a purchasable digital product (seat + 20% deposit); digital so checkout skips the delivery step for reservation-only carts.
- **Waitlist bonus** — sold-out dinners show a banner + waitlist form → `Waitlist` collection + `/api/waitlist`, with an SMS hook (`src/lib/notify.ts`) that goes live once `TWILIO_*` is set.
- **Currency** — site displays prices in **₴ (UAH)**; the store charges in **USD** (payment provider constraint), converted at ~41 ₴/$. A tip on the cart page explains this. See `src/lib/pricing.ts`.
- **Performance** — the nav cart badge is a plain Astro component (not a React island), so React DOM only loads on pages that need it (contact, cart, reserve, product detail).

## Local development
```bash
npm install
npx @wix/cli@latest login
npx @wix/cli@latest dev       # local dev
npx @wix/cli@latest build     # production build
npx @wix/cli@latest release   # publish
```

`.env.local` (git-ignored) holds `WIX_CLIENT_ID` (from `wix env pull`). SMS is
enabled by setting `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.

## Backend seed scripts
One-off scripts under `scripts-seed/` documented the catalog/CMS setup (products,
CMS collections, images, currency, reservations). They read `WIX_TOKEN` /
`WIX_SITE_ID` from the environment — no secrets are committed.

# Vinyl Listening Rooms

A cinematic web-app concept for discovering, hosting, and booking intimate
vinyl-based listening events. Premium, dark, warm, and analog — built to feel
like a 2026 lifestyle product rather than a marketing page.

**Live site:** https://www.vinylroom.online/

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (`@theme inline` design tokens)
- **Framer Motion 12** for scroll reveals, layout transitions, and magnetic motion
- Collectible event sleeves are generated in CSS/Canvas; the interactive DJ
  hologram uses an optimized video asset loaded only for DJ mode.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Real data + payments (Wix Headless)

Rooms and ticketing are backed by **Wix Events**. Out of the box the app runs on
built-in demo data; set a Headless OAuth **Client ID** and it goes live:

```bash
cp .env.example .env.local     # add NEXT_PUBLIC_WIX_CLIENT_ID
```

- Data: [`src/lib/wix/rooms.ts`](src/lib/wix/rooms.ts) fetches upcoming events at
  build time and maps them to rooms. A deferred browser refresh keeps the count,
  dates, availability, and newly created events current without delaying LCP.
- Booking: **Reserve a seat** opens a multi-step modal that reserves tickets
  (`orders.createReservation`) and redirects to the Wix-hosted checkout for
  payment (`redirects.createRedirectSession`). See
  [`src/lib/wix/booking.ts`](src/lib/wix/booking.ts).
- A badge by "Featured listening rooms" shows **Demo data** / **Live from Wix**.
- Accounts: **Sign in** (header) runs Wix members OAuth via `/login-callback`
  ([`src/lib/wix/auth.ts`](src/lib/wix/auth.ts)); tokens persist in the browser so
  a guest's bookings tie to their member account. After paying, visitors land on
  the cinematic **`/thank-you`** page. All of this degrades gracefully in demo mode.
- Hosting: a signed-in member can publish a Wix Event directly from the host
  studio. The browser creates a matching collectible PNG sleeve, then the Wix App
  backend verifies the member token, uploads the image, creates the event and
  ticket definition, and publishes public events.

### Services and APIs used (reviewer summary)

- **Wix Headless OAuth + Wix Members** — visitor/member authentication and the
  sign-in callback.
- **Wix Events V2** — upcoming-event query plus draft creation and publishing.
- **Wix Ticket Definitions / Orders** — capacity, availability, reservations,
  ticket pricing, and Wix-hosted checkout handoff.
- **Wix Media** — stores the automatically generated collectible event cover.
- **Wix Redirects** — creates the secure checkout redirect session.
- **Wix App backend / Wix hosting** — keeps API keys server-side and exposes the
  authenticated `/api/host-events` endpoint. The public site is a static Next.js
  export, so the critical page remains fast on desktop and mobile.

Full walkthrough: **[WIX_SETUP.md](WIX_SETUP.md)**. Optional seed script:
[`scripts/seed-wix-events.mjs`](scripts/seed-wix-events.mjs).

## Structure

```
src/
  app/
    layout.tsx        Fonts (Fraunces + Geist), metadata
    page.tsx          Section composition
    globals.css       Design system: palette, type, utilities, keyframes
    icon.svg          Record-label favicon
  components/
    SpotlightBackground   cursor-reactive warm spotlight + smoky gradients
    NoiseOverlay          fixed analog grain
    Navigation            scroll-aware bar + mobile drawer
    Hero                  parallax vinyl/sleeve stage, magnetic CTAs
    FeaturedRooms         genre filter pills + animated grid
    RoomCard              hover tilt, vinyl slide-out, seat availability
    HowItWorks            host/guest mode toggle, stepped panels
    EventDetailPreview    full mock event page (timeline, rules, equipment)
    BookingPanel          sticky seat picker + reservation
    VinylLineup           expandable tracklist
    CreateRoomPreview     host creator tool with a live-updating preview
    Community             count-up stats + testimonials
    FinalCTA              cinematic closing scene
    NowPlayingWidget      floating, cycles through live rooms
    AlbumArt / VinylDisc / Waveform / MagneticButton / Reveal   primitives
    AppShell.tsx          wires live data + booking provider into the page
    booking/BookingProvider.tsx   multi-step reserve → checkout modal
    member/MemberProvider.tsx     member context (sign-in state)
    member/MemberMenu.tsx         header sign-in / avatar dropdown
  app/
    thank-you/            post-payment confirmation page
    login-callback/       completes Wix members OAuth
  lib/wix/
    client.ts / config.ts   Wix Headless client (OAuth visitor tokens)
    browser.ts              singleton browser client + member-token persistence
    auth.ts                 member login / callback / logout / current member
    rooms.ts                server: Wix Events → rooms, demo fallback
    booking.ts              client: reservation + checkout redirect
  data/
    rooms.ts          demo events + editorial extras, stats, testimonials
```

## Design notes

- **Palette** — near-black bases (`#080706`) with cream text (`#F4E8D0`) and
  warm accents (amber `#D89A45`, burnt orange, burgundy, soft gold).
- **Type** — Fraunces (expressive editorial serif) for headings, Geist for UI.
- **Motion** — subtle and cinematic; everything honours
  `prefers-reduced-motion`.
- Fully responsive: the hero stays cinematic on mobile, cards stack, filters
  scroll horizontally, and the booking flow adapts.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

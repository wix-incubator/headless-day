# Connecting to Wix Headless (real data + payments)

The app runs on built-in demo data out of the box. To make **Featured Rooms**
load from a real Wix site and make **Reserve a seat → checkout → payment** work,
connect a Wix Headless project. ~10 minutes.

The badge next to "Featured listening rooms" reads **Demo data** until a Client
ID is set, then flips to **Live from Wix**.

---

## 1. Create a Wix site with a Headless project

1. Go to <https://www.wix.com/> and create a **blank site** (or use an existing one).
2. In the dashboard, open **Settings → Headless Settings** (or search "Headless").
3. This exposes your site's business data over the Headless APIs.

## 2. Install Wix Events

1. Dashboard → **App Market** → search **Wix Events** → **Add to site**.
2. Wix Events is what powers ticketing + payment for each listening room.

## 3. Turn on a payment method

1. Dashboard → **Settings → Accept Payments**.
2. Connect any provider (Stripe, PayPal, Wix Payments…). Test mode is fine.
   Without this, checkout loads but can't take a card.

## 4. Create an OAuth (Headless) app → get the Client ID

1. Dashboard → **Settings → Headless → OAuth apps → + Create OAuth app**.
2. Give it a name (e.g. "Vinyl Rooms web").
3. Under **Login settings / allowed domains & redirect URIs**, add your dev +
   prod origins **and** the member-login callback:
   - `http://localhost:3200` and `http://localhost:3200/login-callback`
   - your deployed URL + the static callback file, e.g.
     `https://www.vinylroom.online/login-callback.html`
4. Copy the **Client ID**.

## 5. Point the app at it

```bash
cp .env.example .env.local
# then edit .env.local:
NEXT_PUBLIC_WIX_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Restart `npm run dev`. The rooms grid now loads from your Wix site and the badge
shows **Live from Wix**.

---

## 6. Add some events

**Option A — by hand (most reliable).** Dashboard → **Events → + Add Event**.
For each night set a title, date, location, and add a **paid ticket**. To reuse
the app's editorial extras (genre, mood, vinyl lineup, equipment), name the event
so its slug matches one of the demo IDs — e.g. title **"Blue Note After Dark"**
→ slug `blue-note-after-dark`. Any event whose slug doesn't match still shows,
just with a default look. Slugs the app knows about:

```
blue-note-after-dark · in-rainbows · 90s-hip-hop-on-wax · ambient-sunday
japanese-city-pop · wine-soul-motown · kraftwerk-machines · fleetwood-canyon
```

**Option B — seed script (optional accelerator).** Creates all 8 events + a
ticket each via the API. Needs an API key (step below). Field shapes vary a
little across SDK versions, so treat it as a starting point:

```bash
# 1. Create an API key with access to this site and Wix Events write/manage
#    permissions. Read-only Events access can query events but cannot seed them.
#    https://manage.wix.com/account/api-keys
# 2. Find your site's metaSiteId (dashboard URL: /dashboard/<SITE_ID>/...)
# 3. Add both to .env.local (WIX_API_KEY, WIX_SITE_ID), then:
node --env-file=.env.local scripts/seed-wix-events.mjs
```

---

## Hosting on Wix (static)

The app is deployed to Wix as a **static Site**. `wix.config.json` points at
`./out` (Next's static export). Redeploy after any change:

```bash
npm run build     # next export → ./out (Wix Events data is baked in at build)
wix release       # uploads ./out to the Wix site, returns the live URL
```

- **Live URL:** https://www.vinylroom.online
- **Wix fallback URL:** https://ocftju-vinyl-list-7876da37-irakliyt.wix-site-host.com
- **Hosting site dashboard:** https://manage.wix.com/dashboard/89625c22-ba90-416d-bbb7-07d789b5cf3e
- `wix.config.json`'s `appId` is the Wix CLI/static-hosting app id. It is
  separate from `NEXT_PUBLIC_WIX_CLIENT_ID`, which is the Headless OAuth client
  used for Events, checkout, and member auth.
- Data is **baked at build time** (static export can't do request-time SSR) —
  re-run the two commands above to refresh events/prices/availability.
- The frontend is hosted statically, then reads Wix Events and creates checkout
  sessions through the OAuth app configured in `NEXT_PUBLIC_WIX_CLIENT_ID`.

### ⚠️ Make Sign-in + checkout work on the hosted domain

Data display works out of the box. For **member login** and **Reserve → checkout**
to work on the hosted URL, configure both the external app domain and the Wix
pages domain.

First, add the app domain to the OAuth app's **Allowed redirect domains** and
add the exact callback URL to **Allowed redirect URIs** (Settings → Headless →
OAuth apps), alongside your local dev origin:

```
https://www.vinylroom.online
https://www.vinylroom.online/login-callback.html
```

The Wix pages domain can remain the Wix-managed domain shown in Manage URLs.
When Wix returns a same-domain cookie wrapper on static hosting, the app follows
the inner Events checkout URL returned by `createRedirectSession()`.

1. Dashboard → Settings → Development & integrations → Headless Settings.
2. Scroll to **Manage URLs**.
3. In **Wix pages domain**, connect a domain/subdomain for Wix-hosted pages.

Wix-hosted checkout cannot use the same root domain as the external app. For
this site, use a subdomain such as `checkout.vinylroom.online` or
`portal.vinylroom.online`. Until this is configured, `createRedirectSession()`
will return whichever Wix pages domain is attached to the configured Headless
OAuth client, even though the external app itself is live at
`https://www.vinylroom.online`.

## How the pieces map

| Concept in the app | Where it lives on Wix |
| --- | --- |
| A listening room | A **Wix Event** (title, date, location) |
| Seat price / capacity | A **ticket definition** on the event |
| Genre, mood, vinyl lineup, equipment | Editorial extras in `src/data/rooms.ts`, merged by slug |
| Reserve a seat | `orders.createReservation` → `redirects.createRedirectSession({ eventsCheckout })` → Wix-hosted checkout |
| Payment | Handled on Wix via your connected payment provider |
| After payment | Visitor returns to `/thank-you.html` (the checkout `thankYouPageUrl`) |
| Sign in / accounts | Wix members OAuth → `/login-callback.html`; tokens persist in the browser so bookings tie to the member |

### Member accounts (optional but recommended)

The **Sign in** button in the header runs Wix member login (PKCE OAuth):
`generateOAuthData` → Wix-hosted login → back to `/login-callback.html` →
`getMemberTokens`. Tokens persist in `localStorage`, so a signed-in guest's
reservations are attached to their Wix member account and their session survives
reloads. No extra setup beyond adding the `/login-callback.html` redirect URI above.
Wix returns the OAuth `code` and `state` in the URL fragment (`#code=...`), which
matches the JavaScript SDK's Wix-managed login flow.
Code: [`src/lib/wix/auth.ts`](src/lib/wix/auth.ts) ·
[`src/components/member/MemberProvider.tsx`](src/components/member/MemberProvider.tsx).

Data layer: [`src/lib/wix/rooms.ts`](src/lib/wix/rooms.ts) ·
booking: [`src/lib/wix/booking.ts`](src/lib/wix/booking.ts).
Both fail safe — any error or missing config falls back to demo data.

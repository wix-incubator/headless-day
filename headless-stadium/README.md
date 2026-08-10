# Headless Stadium

> **Live site:** [vantage-ar-e72832e3-doronsh8.wix-site-host.com](https://vantage-ar-e72832e3-doronsh8.wix-site-host.com/)

Orbit a procedural New York arena, click any of ~24,000 individually generated seats, and fly into a first-person view of the pitch — live scoreboard, price tiers, hover tooltips, and real Wix checkout. Every seat is one instance in a single draw call; commerce and event registration run through the Wix JavaScript SDK in the browser.

## Technologies

- **Framework:** Vite 7 + vanilla JavaScript
- **3D:** three.js r182 (WebGL instanced seats, spatial-hash picking)
- **Wix integration:** Self-Managed Headless — `@wix/sdk` with OAuth (`VITE_WIX_CLIENT_ID`)
- **Wix Business Solutions:** Wix Stores, Wix eCommerce (hosted checkout), Wix Events (RSVP watch party; optional ticketed checkout)
- **Deployment:** Wix hosting via Wix CLI (`npx @wix/cli release` → `dist/`)

## Project structure

```
headless-stadium/
├── index.html          # SPA shell
├── src/
│   ├── main.js         # renderer, camera flights, boot sequence
│   ├── stadium.js      # procedural scene (pitch, bowl, LED halo, players)
│   ├── seats.js        # ~24k instanced seats + picking grid
│   ├── wix.js          # Stores cart/checkout, Events RSVP, optional Events tickets
│   ├── data.js         # event fixture data (merged with live Wix Event when configured)
│   ├── ui.js           # fixture bar, seat card, watch-party modal
│   ├── calendar.js     # Google Calendar + .ics
│   ├── geom.js         # superellipse bowl math
│   └── style.css
├── docs/               # README screenshots
├── package.json
├── wix.config.json
└── .env.example
```

## Features

| Feature | How it works |
|---|---|
| **Orbit → select → preview** | Click a seat for its card; click again (or Preview) to fly into first-person view |
| **Buy this seat** | Adds the tier's Stores product to cart → Wix hosted checkout |
| **Watch party RSVP** | Free registration against live Wix Events (`watch-the-final-at-wix-campus`) |
| **Add to calendar** | Google Calendar link or downloadable `.ics` |
| **Seat browsing in view** | Arrow keys or click visible seats while seated |

> Concept demo — seat availability is simulated. Checkout and RSVP use real Wix Headless integrations.

## How to create this yourself

### Prerequisites

- Node.js 20+
- A [Wix account](https://manage.wix.com)
- A [headless OAuth app](https://dev.wix.com/docs/go-headless/authentication/setup/set-up-a-headless-client) (`VITE_WIX_CLIENT_ID`)

---

### Option A: Download & run this project

> Run all commands from inside `headless-stadium/`, not the monorepo root.

1. **Sparse-clone just this folder:**
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set headless-stadium
   cd headless-stadium
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment variables:**
   ```bash
   cp .env.example .env
   ```
   Set `VITE_WIX_CLIENT_ID` to your Headless OAuth app client id (Dashboard → Headless Settings → OAuth apps).

4. **Run locally:**
   ```bash
   npm run dev
   ```
   Without `VITE_WIX_CLIENT_ID` the 3D arena still runs; checkout and RSVP are disabled.

5. **Deploy on Wix hosting:**
   ```bash
   Edit `wix.config.json`   # fill in appId + siteId
   npx @wix/cli@latest login
   npm run build
   npx @wix/cli@latest release
   ```

---

### Option B: Build from scratch

1. Create a Wix Headless project and OAuth app in the dashboard.
2. Scaffold a Vite SPA, install `three`, `@wix/sdk`, `@wix/stores`, `@wix/ecom`, `@wix/events`, `@wix/redirects`.
3. Wire `OAuthStrategy({ clientId })` and commerce calls in a module like `src/wix.js`.
4. Create Stores products per price tier; optionally create Wix Events for ticketed checkout and RSVP.
5. Build with `vite build` and release with the Wix CLI.

See [Self-Managed Headless quick start](https://dev.wix.com/docs/go-headless/get-started/quick-starts/self-managed-headless/quick-start-a-self-managed-headless-project).

---

## Connect your own Wix site

1. **Stores checkout** — install Wix Stores; create products whose names contain `Halfway Club`, `Lower Bowl`, `Goal End`, `Upper Bowl`.
2. **Watch party** — install Wix Events; create a free RSVP event with slug `watch-the-final-at-wix-campus` (or update `WATCH_PARTY_SLUG` in `src/wix.js`).
3. **Live match + ticket checkout (optional)** — set `WIX_EVENT_SLUG` in `src/wix.js` to a ticketed event slug; match metadata and Events checkout activate automatically.

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repository is encouraged, but is done entirely at the responsibility of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose. Always review and test the code before deploying to a production environment.

# ARCSTEP

> **Live Site:** [arcstep-au-02b1a0fb-yogevbd.wix-site-host.com](https://arcstep-au-02b1a0fb-yogevbd.wix-site-host.com/)

A browser-based music sketchpad and loop editor — a DAW-style studio UI with arrangement timeline, piano roll, session view, sound browser, and transport controls. Members can sign in with Wix OAuth to save projects to the cloud, read production tips from the Wix Blog, and subscribe to pricing plans.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (static output) + vanilla TypeScript client
- **Wix Integration:** Self-Managed Headless — client-side OAuth via `@wix/sdk`, deployed with the Wix CLI
- **Wix Business Solutions:**
  - [Wix Members](https://dev.wix.com/docs/sdk/api-reference/members/introduction) — sign-in and member profiles
  - [Wix Data](https://dev.wix.com/docs/sdk/api-reference/data/introduction) — cloud project storage (`ArcstepSongs` CMS collection)
  - [Wix Blog](https://dev.wix.com/docs/sdk/api-reference/blog/introduction) — Journal field notes
  - [Wix Pricing Plans](https://dev.wix.com/docs/sdk/api-reference/pricing-plans/introduction) — subscription plans and checkout
  - [Wix Redirects](https://dev.wix.com/docs/sdk/api-reference/redirects/introduction) — hosted checkout redirects
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`) — static `dist/` hosted on Wix infrastructure

## Project Structure

```
arcstep/
├── public/                 # Static assets (favicon)
├── src/
│   ├── layouts/
│   │   └── Layout.astro    # HTML shell, fonts, meta
│   ├── pages/
│   │   └── index.astro     # Full studio UI (arrangement, editor, panels)
│   ├── scripts/
│   │   └── studio.ts       # Audio engine, Wix SDK, UI logic
│   └── styles/
│       └── global.css      # Tailwind + theme tokens
├── astro.config.mjs
├── package.json
├── .env.example            # PUBLIC_WIX_CLIENT_ID for OAuth
└── wix.config.example.json # Reference only — generated locally for deploy
```

## How to Create This Yourself

### Prerequisites

- Node.js v20.11.0+
- A [Wix account](https://manage.wix.com)
- A [headless client / OAuth app](https://dev.wix.com/docs/go-headless/authentication/setup/set-up-a-headless-client) configured for your site
- [Wix CLI](https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli) for deployment:
  ```bash
  npm install -g @wix/cli
  ```

---

### Option A: Download & Run This Project

> **Important:** All commands below must be run from inside the `arcstep/` folder, **not** the monorepo root.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set arcstep
   cd arcstep
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Paste your headless OAuth **Client ID** as `PUBLIC_WIX_CLIENT_ID`. Find it in your Wix dashboard under **Headless Settings**.

4. **Configure your Wix dashboard** — see [Dashboard setup](#dashboard-setup) below.

5. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321). The studio UI works without sign-in; member features (cloud save, blog, plans) require a valid `PUBLIC_WIX_CLIENT_ID`.

6. **Build and deploy:**
   ```bash
   npm run build
   wix login
   npm create @wix/new@latest init
   npm run release
   ```
   `npm create @wix/new@latest init` provisions a site and writes `wix.config.json` (gitignored). Add your production URL as an allowed OAuth redirect URI in Headless Settings before deploying.

---

### Option B: Build It From Scratch

1. **Create a headless project** in your [Wix dashboard](https://manage.wix.com) and set up an OAuth client. Note the Client ID.

2. **Scaffold an Astro site:**
   ```bash
   npm create astro@latest
   ```
   Choose the minimal template with TypeScript.

3. **Install Wix SDK packages:**
   ```bash
   npm install @wix/sdk @wix/data @wix/blog @wix/members @wix/pricing-plans @wix/redirects @wix/cli
   npm install tailwindcss @tailwindcss/vite
   ```

4. **Wire client-side OAuth** with `OAuthStrategy` and `createClient` from `@wix/sdk`. Store tokens in `localStorage` and use `auth.elevate` patterns for member-scoped CMS writes.

5. **Build the studio UI** — arrangement timeline, Web Audio API playback, piano roll, and member panels for projects, blog, and plans.

6. **Deploy** with `wix build` / `wix release` after linking via `npm create @wix/new@latest init`.

For full docs, see [Quick Start a Self-Managed Headless Project](https://dev.wix.com/docs/go-headless/get-started/quick-starts/self-managed-headless/quick-start-a-self-managed-headless-project).

---

### Dashboard setup

After creating your headless OAuth client, configure the following in [manage.wix.com](https://manage.wix.com):

| What | Where | Details |
|------|-------|---------|
| **OAuth redirect URIs** | Headless Settings | Add `http://localhost:4321/` for local dev and your production URL (e.g. `https://your-site.wix-site-host.com/`) |
| **Wix Members** | App Market | Required for sign-in, cloud project save, and plan subscriptions |
| **Wix Blog** | App Market | Powers the Journal panel — create posts titled for production tips |
| **Wix Pricing Plans** | App Market | Powers the Plans panel and hosted checkout |
| **ArcstepSongs** | CMS (Content Manager) | Collection for member project storage. Suggested fields: `title` (Text), `tempo` (Number), `songState` (JSON), `accent` (Text), `duration` (Number), `isFavorite` (Boolean). Set permissions so members can insert/read/update their own items. |

The demo studio (arrangement, transport, piano roll) runs entirely in the browser without Wix. Member sign-in, cloud saves, blog, and plans require the dashboard setup above.

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

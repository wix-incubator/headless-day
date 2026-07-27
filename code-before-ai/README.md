# Code Before AI

> **Live Site:** [https://xp-code-st-62ee426b-mindaugasu.wix-site-host.com](https://xp-code-st-62ee426b-mindaugasu.wix-site-host.com)

A Windows XP-styled event site where programmers tell stories about writing code before AI. Visitors browse upcoming events in an XP "Event Explorer" window, open event details, and submit RSVPs — all styled as 2001-era desktop UI. Built on top of Wix Events with a full RSVP flow. Clicking "Close" on the main window triggers a BSOD easter egg.

## Technologies

- **Framework:** Next.js 16 (React 19) via [vinext](https://github.com/cloudflare/vinext) — Next.js App Router running on Cloudflare Workers
- **Wix Integration:** Self-Managed Headless — Wix Events + RSVP (`@wix/events`, `@wix/sdk`)
- **Styling:** Tailwind CSS 4 + inline CSS (XP theme in `wix-static/index.html`)
- **Language:** TypeScript
- **Deployment:** Wix Static Hosting (`wix-static/index.html` deployed via `wix release`); full server-side app via Cloudflare Workers

## Project Structure

```
code-before-ai/
├── app/
│   ├── page.tsx              # Home — fetches events server-side, renders XP desktop
│   ├── xp-desktop.tsx        # React XP desktop UI (event grid, details, RSVP wizard)
│   ├── wix-events.ts         # Wix SDK client — loads events, submits RSVPs (server-side)
│   ├── events-data.ts        # Fallback seed events (shown when Wix API not configured)
│   ├── layout.tsx
│   └── api/
│       ├── events/route.ts   # GET /api/events — proxies Wix Events to the client
│       └── rsvp/route.ts     # POST /api/rsvp — submits RSVP to Wix Events
├── wix-static/
│   └── index.html            # Self-contained static page deployed to Wix Hosting
│                             # Uses @wix/sdk OAuthStrategy directly in the browser
├── worker/index.ts           # Cloudflare Worker entry point (vinext + image optimization)
├── db/                       # Drizzle ORM schema (empty by default; D1 opt-in)
├── examples/d1/              # Example: opt-in Cloudflare D1 database integration
├── .env.example              # Required environment variables
├── wix.config.example.json   # Rename to wix.config.json after running init
└── package.json
```

## Two Deployment Targets

This project ships in two flavours that share the same visual design:

| Target | File | Auth | How to deploy |
|--------|------|------|---------------|
| **Wix Static Hosting** | `wix-static/index.html` | OAuthStrategy (clientId in HTML) | `CI=1 npx @wix/cli@latest release` |
| **Cloudflare Workers** | `worker/index.ts` + Next.js app | ApiKeyStrategy (env vars) | `vinext build` → Cloudflare dashboard |

The live site linked above uses the Wix Static Hosting path.

## How to Create This Yourself

### Prerequisites

- Node.js `>=22.13.0`
- A [Wix account](https://manage.wix.com)
- [Wix Events](https://support.wix.com/en/article/wix-events-getting-started) installed on your site, with at least one RSVP event published

---

### Option A: Download & Run This Project

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set code-before-ai
   cd code-before-ai
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Set up environment variables** for server-side Wix access:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and fill in your values:
   ```
   WIX_API_KEY="your-wix-api-key"
   WIX_SITE_ID="your-wix-site-id"
   ```
   Get your API key from **Wix Dashboard → Settings → API Keys**. Without these, the app runs with fallback demo events.

4. **Run locally:**
   ```bash
   npm run dev
   ```

5. **Deploy to Wix Static Hosting:**

   First, connect this project to your Wix site:
   ```bash
   npm create @wix/new@latest init
   ```
   This generates a local `wix.config.json` with your site's `appId` and `siteId` (gitignored — not committed).

   Then update the `clientId` in `wix-static/index.html` to match the `appId` from your new `wix.config.json` (this is your public OAuth client ID, safe to embed in the browser).

   Finally, release:
   ```bash
   CI=1 npx @wix/cli@latest release
   ```

---

### Option B: Build It From Scratch

1. **Scaffold a new Next.js project** and install vinext:
   ```bash
   npx create-next-app@latest code-before-ai --typescript --tailwind --app
   cd code-before-ai
   npm install vinext @wix/sdk @wix/events
   ```

2. **Set up your Wix site** — install the Wix Events app from the App Market in [manage.wix.com](https://manage.wix.com) and create RSVP-type events.

3. **Configure the Wix SDK** server-side using `ApiKeyStrategy`:
   ```ts
   import { ApiKeyStrategy, createClient } from "@wix/sdk";
   import { rsvpV2, wixEventsV2 } from "@wix/events";

   const client = createClient({
     modules: { wixEventsV2, rsvpV2 },
     auth: ApiKeyStrategy({ apiKey: process.env.WIX_API_KEY!, siteId: process.env.WIX_SITE_ID! }),
   });
   ```

4. **Build API routes** for events (`GET /api/events`) and RSVPs (`POST /api/rsvp`).

5. **Build the static HTML version** (`wix-static/index.html`) using `OAuthStrategy` with your site's public OAuth client ID:
   ```js
   import { createClient, OAuthStrategy } from "https://esm.sh/@wix/sdk@1.21.13";
   const client = createClient({
     modules: { wixEventsV2, rsvpV2 },
     auth: OAuthStrategy({ clientId: "YOUR_OAUTH_CLIENT_ID" }),
   });
   ```

6. **Connect to Wix Hosting** and deploy:
   ```bash
   npm create @wix/new@latest init
   CI=1 npx @wix/cli@latest release
   ```

For full docs, see [Self-Managed Headless Quick Start](https://dev.wix.com/docs/go-headless/get-started/quick-starts/self-managed-headless/quick-start-a-self-managed-headless-project).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.

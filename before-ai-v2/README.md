# Code Before AI

A Windows XP–themed event site for programmers telling stories about writing code before AI. Browse upcoming events in draggable XP windows and RSVP via **Wix Events**.

**Live site:** https://xp-code-st-62ee426b-mindaugasu.wix-site-host.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Event listings | **Wix Events** — `queryEvents` |
| RSVP submissions | **Wix Events** — `rsvpV2.createRsvp` |
| Production hosting | **Wix Managed Headless** — static `wix-static/` output |

Without Wix credentials the app falls back to built-in demo events and a local demo RSVP flow.

## Run locally

> All commands below must be run from inside the `before-ai-v2/` folder, not the monorepo root.

**Prerequisites:** Node.js `>=22.13.0`

```bash
npm install
npx @wix/cli login
npm create @wix/new@latest init    # writes wix.config.json (git-ignored)
```

After `init`, copy `appId` from `wix.config.json` into `wix-static/index.html` (`YOUR_WIX_APP_ID` placeholder) so the hosted static page can authenticate with Wix Events.

For server-side event loading and RSVP during local dev, create `.env.local`:

```bash
cp .env.example .env.local
# WIX_API_KEY=...
# WIX_SITE_ID=...   (or WIX_ACCOUNT_ID for account-scoped keys)
```

```bash
npm run dev       # vinext dev server
npm run build     # verify build output
```

## Deploy to Wix

Wix managed hosting serves `wix-static/index.html`. The page uses the public OAuth client id (`wix.config.json` → `appId`) in the browser to load events and submit RSVPs.

```bash
npm run build
CI=1 npx @wix/cli@latest release
```

## Stack

- **vinext** + **Next.js 16** / **React 19** — local dev and API routes (`/api/rsvp`)
- **`@wix/events`** — events query + RSVP
- **`wix-static/`** — production static bundle deployed to Wix hosting

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

# At Latest Feed (@latest)

A DevRel dashboard for the web ecosystem **@latest** signals — searchable, filterable trend reports with ecosystem logos and rich metadata. Built on **Wix Managed Headless** with **Astro + React**.

**Live site:** https://dev-rel-we-06fb1158-omerse1.wix-site-host.com/

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Trend catalogue | **Wix CMS (Data)** — `WebTrends` collection |
| Member favorites | **Wix CMS (Data)** — `TrendFavorites` |
| Report feedback | **Wix CMS (Data)** — `TrendReportFeedback` |
| Sign-in & gating | **Wix Members** — OAuth; `@wix.com` email domain required |

Trend data is loaded from CMS via `src/lib/trends.ts`, with a static fallback in `src/data/trends.ts` when the collection is empty.

## Pages & APIs

- `/` — main dashboard (filters, search, trend cards, detail modal)
- `/login` — Wix Members OAuth
- `/sign-out` — clears session
- `/access-denied` — shown when the signed-in member is not on `@wix.com`
- `/api/favorites` — member favorites (CMS)
- `/api/feedback` — trend report feedback (CMS)

## Run locally

```bash
npm install
npm run dev    # wix dev → http://localhost:4321
```

Requires a logged-in Wix CLI session:

```bash
npx @wix/cli login
```

Then connect your own site (or copy `wix.config.json` to `wix.config.json` and fill in your IDs):

```bash
npm create @wix/new@latest init
```

## CMS setup scripts

Optional Python helpers under `tools/` seed collections and media. They read the site ID from `WIX_SITE_ID` or local `wix.config.json`:

```bash
export WIX_SITE_ID=your-site-id   # or use wix.config.json
python3 tools/ensure-feedback-cms.py
python3 tools/seed-web-trends-cms.py
python3 tools/upload-trend-images-to-wix.py
```

Generate a CLI token with `npx @wix/cli token --site <site-id>` if the scripts need API access.

## Stack

- **Astro 5** — SSR pages and API routes
- **React 18** — dashboard UI (Framer Motion)
- **Wix Headless** — CMS, Members, managed hosting
- **`@wix/data`** — CMS queries
- **`@wix/members`** — OAuth session

---

**Headless Day** — July 9, 2026 · Wix internal event

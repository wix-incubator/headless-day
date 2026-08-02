# Vechornytsi

A single-table supper club on the Dnipro, built as a **Wix Headless** site
(Astro SSR + `@wix/sdk`). Twelve seats, a weekly-changing seven-course tasting
menu, reservations, a small pantry shop, and a live waitlist.

**Live:** https://vechornyts-6930bfec-tetianaza.wix-site-host.com

See [`SPEC.md`](./SPEC.md) for the full build spec (art direction, pages, business
solutions, and key decisions).

## Stack
- [Astro](https://astro.build) (server output) + React islands
- [`@wix/sdk`](https://dev.wix.com/docs/sdk) — Stores, eCom, Data (CMS), Forms, Redirects
- Tailwind CSS v4
- Wix hosting (`wix build` / `wix release`)

## Run locally

> All commands below must be run from inside the `vechornytsi/` folder, not the monorepo root.

```bash
npm install
npx @wix/cli login
npm create @wix/new@latest init
npm run dev                    # wix dev → http://localhost:4321
```

`npm create @wix/new@latest init` provisions a new Wix site and writes a local
`wix.config.json` (git-ignored). Install **Wix Stores**, **Wix CMS**, and **Wix Forms**
on your site, then seed dinners/products/collections (see `scripts-seed/` and `SPEC.md`).

Authentication is ambient on Wix-managed Astro — no OAuth client setup; SDK calls work
in SSR pages, API routes, and React islands once linked to your site.

## Build & deploy

```bash
npm run build      # wix build
npm run release    # publish to Wix hosting
```

## Optional environment

Waitlist SMS notifications (`src/lib/notify.ts`) activate when these are set in
`.env.local` (git-ignored):

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

Without Twilio configured, waitlist signups are stored in CMS and SMS is stub-logged only.

## Project layout
```
src/
  pages/        routes (astro) + api/ endpoints
  components/   islands (React) + astro components
  lib/          content (CMS), pricing, media, notify
  styles/       global.css (design tokens) + per-pack CSS
scripts-seed/   one-off backend seed scripts (context only)
SPEC.md         full build spec
```

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

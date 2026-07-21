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

## Getting started
```bash
npm install
npx @wix/cli@latest login
npx @wix/cli@latest dev        # http://localhost:4321
```

## Build & deploy
```bash
npx @wix/cli@latest build
npx @wix/cli@latest release
```

## Environment
Copy your Wix client id into `.env.local` (git-ignored):
```bash
npx @wix/cli@latest env pull --json   # writes WIX_CLIENT_ID
```
Optional (waitlist SMS): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.

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

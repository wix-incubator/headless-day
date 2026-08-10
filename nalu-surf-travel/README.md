# Nalu Surf Travel 🚁🌊

A booking site for a surf-travel agent, built on **Wix Headless**.

Fly **Nalu**, a toy helicopter, over a low-poly toy globe with the arrow keys, land at surf destinations to see travel windows (tide & wind), top spots, and book a real trip-planning session with the agent via **Wix Bookings**.

**Live site:** https://birdie-bre-2b166b6a-giladi47.wix-site-host.com/

- Design spec: [`docs/superpowers/specs/2026-07-09-birdie-breaks-design.md`](docs/superpowers/specs/2026-07-09-birdie-breaks-design.md)
- Scaffold facts: [`docs/scaffold-notes.md`](docs/scaffold-notes.md)

## What powers it

| Concern | Wix Business Solution |
|---|---|
| Trip-planning sessions | **Wix Bookings** — availability, `createBooking` |
| Confirm free bookings | **Wix eCommerce** — Cart V2 `createCart` → `placeOrder` (no hosted checkout redirect when total is $0) |
| Hosting | **Wix Managed Headless** (`@wix/astro`, Astro SSR + React island) |

Booking happens in-game (no separate checkout URL): land at a destination → **Book with your surf agent** → pick a slot → confirm.

## Run locally

> All commands below must be run from inside the `nalu-surf-travel/` folder, not the monorepo root.

Requires Node 20 — run `eval "$(fnm env)" && fnm use 20` before any command.

```bash
npm install
npx @wix/cli login
npm create @wix/new@latest init    # generates wix.config.json (git-ignored; see wix.config.json)
npm test                           # Vitest + React Testing Library
npm run dev                        # http://localhost:4321/
npm run build                      # wix build → astro build
npm run release -- --version-type minor --comment "..."   # deploy a new live version
```

`src/bookings/config.ts` reads the public OAuth client id from `wix.config.json#appId` (required in the browser bundle).

Built on the Wix Headless Astro template (`@wix/astro`, SSR) with `@astrojs/react` — the game mounts as a single React island. Implementation plan: [`docs/superpowers/plans/2026-07-09-birdie-breaks.md`](docs/superpowers/plans/2026-07-09-birdie-breaks.md).

## Wix Bookings setup (one-time)

Install **Wix Bookings** on your site, then create a service named exactly **"Surf trip planning session"** — 30 min, online, free. Without it, the in-game calendar shows Nalu's "Choppy connection!" message.

## Wix Headless docs

- [Wix Headless Documentation](https://dev.wix.com/docs/go-headless)
- [Wix SDK Documentation](https://dev.wix.com/docs/sdk)

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

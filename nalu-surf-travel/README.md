# Nalu Surf Travel 🚁🌊

A booking site for a surf-travel agent, built on **Wix Headless**.

Fly **Nalu**, a toy helicopter, over a low-poly toy globe with the arrow keys, land at surf destinations to see travel windows (tide & wind), top spots, and book a real trip-planning session with the agent via **Wix Bookings**.

- Design spec: [`docs/superpowers/specs/2026-07-09-birdie-breaks-design.md`](docs/superpowers/specs/2026-07-09-birdie-breaks-design.md)
- Scaffold facts: [`docs/scaffold-notes.md`](docs/scaffold-notes.md)

## Development

**Live site:** https://birdie-bre-2b166b6a-giladi47.wix-site-host.com/

Requires Node 20 — run `eval "$(fnm env)" && fnm use 20` before any command.

```bash
npm install        # install dependencies
npm test           # run the vitest suite (Vitest + React Testing Library)
npm run dev        # dev server at http://localhost:4321/
npm run build      # production build (wix build → astro build)
npm run release -- --version-type minor --comment "..."   # deploy a new live version
```

Built on the Wix Headless Astro template (`@wix/astro`, SSR) with `@astrojs/react` — the game mounts as a single React island. Implementation plan: [`docs/superpowers/plans/2026-07-09-birdie-breaks.md`](docs/superpowers/plans/2026-07-09-birdie-breaks.md). (Per-task briefs, reports, and E2E screenshots live under `.superpowers/sdd/` locally — gitignored, not part of this clone.)

## Setup remaining (manual, one-time)

The **Wix Bookings service is not created yet** — booking a session currently fails gracefully (Nalu's "Choppy connection!" message, with a working retry) because the site has no bookable service. To finish setup:

1. Open the [Wix dashboard](https://manage.wix.com/dashboard/56b38fa1-9831-4c0a-b87d-0cef220a61b5/home) → Bookings.
2. Create a service named exactly **"Surf trip planning session"** — 30 min, online, free.
3. Reload the live site and the booking calendar will show real availability.

## Wix Headless docs

- [Wix Headless Documentation](https://dev.wix.com/docs/go-headless)
- [Wix SDK Documentation](https://dev.wix.com/docs/sdk)

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

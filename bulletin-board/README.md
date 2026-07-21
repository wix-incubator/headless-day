# Bulletin Board — interactive portfolio canvas

An infinite, draggable cork board built as a UX designer portfolio template. Sticky notes, skill tags, and quotes are pinned across a panning canvas — visitors drag in any direction to explore.

Built with **Next.js 15** (App Router) + **React 19**.

**Live site:** https://www.bullet-in-board.online/

## What it is

| Element | Description |
|---|---|
| Sticky notes | Coloured paper cards with pushpins — intro, quote, connect CTA |
| Skill tags | Dark pill badges for UX skills (Figma, Wireframing, Design Systems…) |
| Cork board | Infinite panning canvas with a textured cork background |
| Drag-to-explore | Mouse and touch drag across a 3000×2000 virtual canvas |

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
```

No environment variables required — all content is defined in `src/app/page.tsx`.

## Customise it

All pins live in the `PINS` array at the top of `src/app/page.tsx`. Each entry has:

```ts
{ id, x, y, type: "note" | "tag", content, color?, rotation }
```

Change the text, colours, positions, and rotations to make it your own. The canvas size is set via the `width`/`height` on the draggable layer — increase it for more room.

## Stack

- **Next.js 15** — App Router, client component canvas
- **React 19** — pointer and touch event handlers
- **Tailwind CSS** — utility styling
- **No external data source** — fully static, deploy anywhere (Vercel, Wix Headless, etc.)

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

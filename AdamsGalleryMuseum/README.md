# Adam's Museum — Collection No. 01 / 2026

> A first-person 3D gallery built on WebGL. 89 photographs. Three wings. Museum-grade caption plaques. No framework.

**→ [adamsmuseum.art](https://www.adamsmuseum.art/)**

---

## What it is

A walkthrough photography gallery built entirely in the browser — no React, no build pipeline, no backend. You navigate through three halls (Portraits, Street, Places) in first-person, approach photographs on the walls, and read museum-style critical captions below each one.

Every caption was written in the voice of a contemporary art critic: two or three sentences focused on spatial dynamics, perceptual disruption, and conceptual weight. No literal description of what's in the photo.

---

## How it works

Everything runs in a single HTML file.

- **Three.js r160** renders the gallery: BoxGeometry halls, PlaneGeometry frames, CanvasTexture plaques, pointer-lock first-person navigation.
- **Caption plaques** are drawn on an off-screen `<canvas>` at runtime — artist / title / medium / body — then turned into a `THREE.CanvasTexture` and placed below each frame.
- **Photo data** lives in `gallery-data.js`, which sets `window.GALLERY_WIX` with Wix CDN `mediaId`s. Images are served via `static.wixstatic.com/media/{id}/v1/fit/…` with on-the-fly resizing.
- **Lightbox** opens on click with a side panel showing the full caption at readable size.
- **Deployed** as a Wix Headless app (`frontendBuild: none`) — `index.html` is the artifact.

```
gallery-data.js      → photo manifest (mediaIds, wings, dimensions)
gallery_template.js  → the full gallery source (HTML + CSS + JS)
repack.py            → encodes the template into index.html for deploy
index.html           → the deployable (Wix Headless target)
```

---

## Source

The gallery source is `gallery_template.js` — plain HTML/CSS/JS, no transpilation. `index.html` is a JSON-encoded bundle of it (Wix Headless `__bundler/template` format). To edit and redeploy:

```bash
# 1. edit gallery_template.js
# 2. repack
python3 repack.py

# 3. deploy
npx @wix/cli@latest release
```

---

## Features

- First-person WASD / arrow key / mouse navigation with pointer lock
- Crosshair with hover state on approaching a photograph
- Floor-plan minimap
- Ambient audio
- Per-photo canvas-rendered museum plaques (artist / frame ID / medium / critical text)
- Lightbox with full-caption sidebar panel
- Responsive — lightbox stacks vertically on mobile

---

## About

This is a personal project — my photographs, my captions, my gallery. The architecture is intentionally minimal: one HTML file, one data file, no dependencies beyond Three.js loaded from CDN.

The caption texts were generated with Claude using a strict art-critic brief: no object description, focus on spatial logic, perception, and tension. Each one went through the same lens a curator would apply before mounting a label on a wall.

---

*Adam Disatnik, 2026*

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

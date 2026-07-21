# Adam's Gallery — Collection No. 01 / 2026

Immersive 3D WebGL photography gallery — *Light & People*. First-person walkthrough through three wings (Portraits, Street, Places), floor-plan minimap, ambient sound, crosshair navigation, and museum-style caption plaques for all 89 photographs.

**Live:** [adamsmuseum.art](https://www.adamsmuseum.art/)  
**GitHub:** [AdamDisa1/AdamsGalleryMuseum](https://github.com/AdamDisa1/AdamsGalleryMuseum)

---

## Architecture

This is a single-file Wix Headless app (`frontendBuild: none`). No build step — `index.html` is the deployable artifact.

**How it works:**

- `gallery-data.js` — static JS file, sets `window.GALLERY_WIX = { counts, photos }` at load time. Each photo record carries a `mediaId` (Wix CDN file ID), `wingKey`, and display metadata.
- `index.html` — the full gallery. Reads `window.GALLERY_WIX` on init, builds Three.js r160 scene with 89 framed photos across three halls. Uses `static.wixstatic.com/media/{mediaId}/v1/fit/…` for on-the-fly resized images.
- Caption plaques — per-photo `<canvas>`-rendered museum labels: *Adam Disatnik / Frame [ID], 2026 / 35mm Film* + 2–3 sentence art-critical body text, drawn as a Three.js `CanvasTexture` below each frame.

**Stack:** Three.js r160, vanilla JS, Wix Headless (no SDK at runtime), deployed via `@wix/cli`.

---

## Adding or updating photos

1. Upload the image to Wix Media Manager.
2. Copy the media file ID (the segment after `/media/` in the CDN URL).
3. Add an entry to `gallery-data.js` with `mediaId`, `wingKey` (`portraits` | `street` | `places`), and an `id` (e.g. `N05`).
4. Add a caption entry to the `CAPTIONS` object in `gallery_template.js` with `{b: '...'}`.
5. Repack and release:

```bash
# repack template → index.html
python3 repack.py

# deploy
cd ~/adams-gallery && npx @wix/cli@latest release
```

---

## Caption plaques

All 89 captions were written in the voice of a contemporary museum director and art critic — never describing literal objects, focusing instead on spatial dynamics, perceptual disruption, and conceptual weight. Format:

> *Adam Disatnik / Frame [ID], 2026 / 35mm Film*  
> [2–3 sentence art statement]

Captions live in the `CAPTIONS` object in `gallery_template.js` (keyed by photo ID).

---

## Release

```bash
cd ~/adams-gallery && npx @wix/cli@latest release
```

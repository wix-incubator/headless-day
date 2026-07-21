# Villa Serena — Performance & SEO Playbook

How this site applies the findings in
[scroll-animation-research.md](./scroll-animation-research.md), plus the operational
knobs to tune. Everything lives in [src/pages/index.astro](../src/pages/index.astro)
(deliberately self-contained: one page, inline engine, no framework runtime).

## Scroll engine (the `Zone` class)

| Decision | Value | Why |
|---|---|---|
| Structure | 640vh (desktop) / 460vh (mobile) single zone + `position: sticky` 100svh stage | consensus architecture; `svh` avoids mobile URL-bar resize thrash |
| Frames | 120, WebP, q82 desktop (1280×720) / q72 mobile (960×540) | WebP decodes faster than AVIF — decode cost dominates in a scrub |
| Scroll handling | passive reading via rAF loop; draw only when frame index changes | never draw in the scroll event |
| Smoothing | lerp `0.13` desktop / `0.16` mobile + Gaussian dwell remap (`DWELL_PEAK` 2.8/2.2) | cinematic catch-up feel; dwells make the film "almost stop" at content |
| DPR | capped at 1.5 desktop, 1 mobile | >1.5× buys nothing from a 720p source and multiplies draw cost |
| Loading | every-4th frame first (loader gate), rest in batches of 10 | first paint fast, full fidelity streams in |
| Gaps | `nearestFrame()` fallback | fast flicks draw the closest decoded frame instead of stalling |
| Layout reads | one `getBoundingClientRect` per zone per rAF tick | onscreen check + progress share the same rect |
| Reduced motion | static frame 0, all overlays visible, no rAF loops | `prefers-reduced-motion` consensus |

**Memory model**: all 120 frames are decoded and retained. That is safe at
720p (≈3.7 MB/frame decoded desktop → ~440 MB worst case across both zones on
desktop; mobile uses 960×540 ≈ 2 MB/frame). For true 1080p sources this would exceed
iOS budgets — the windowed decoder on branch `feat/windowed-frame-decoder` (16-frame
sliding window, `bitmap.close()` eviction, benchmarked at parity: 8.3 ms p50) is the
prerequisite for an HD upgrade. See research doc §3 and §8.

## Compositing rules learned the hard way

- `overflow-x: clip` on `html`/`body`, **never `hidden`** — `hidden` creates a scroll
  container and silently breaks `position: sticky`.
- No `backdrop-filter` over the animating canvas (stat bar uses solid
  `rgba(20,18,16,0.55)`); on mobile all backdrop-filters and the grain layer are
  disabled entirely.
- Ambient extras (particles, custom cursor, gallery parallax) are desktop-only and
  reduced-motion-gated.

## SEO / semantics checklist (all in place)

- One `h1` (hero title + `sr-only` descriptive suffix), `h2` sections, `h3` amenity
  titles; `lang`, meta description, canonical.
- Canonical/OG URLs force `https:` — behind the Wix proxy `Astro.url` reports http.
- OG + Twitter cards with image dimensions; `LodgingBusiness` JSON-LD;
  `theme-color`; static `/favicon.svg`.
- `robots.txt` + `sitemap.xml` are **served by the Wix platform** (auto-generated,
  domain-aware, editable in SEO Tools) — do not add repo copies; they would be
  shadowed and go stale on domain changes.
- Fonts: preconnect + async stylesheet (`media="print"` swap) with `noscript`
  fallback; first frame of zone 1 preloaded per breakpoint.
- Gallery images: real `alt` text, `loading="lazy"`, `decoding="async"`.
- `build.inlineStylesheets: "always"` — no render-blocking CSS request.

## Backend (Wix Headless)

- Content: three CMS collections (`amenities`, `villa-sections`, `villa-stats`)
  fetched server-side in [content.ts](../src/lib/content.ts) with a 5-minute TTL
  module cache + inflight dedup; the page falls back to built-in copy if the CMS is
  unreachable, so the site never renders empty.
- Inquiries: [api/inquiry.ts](../src/pages/api/inquiry.ts) validates and forwards to
  a Wix Form (`createSubmission`); the client posts JSON and reports status via an
  `aria-live` node.
- Backend content is fetched at runtime — editing CMS items needs no re-release.

## Tuning knobs (all constants at the top of the `<script>` in index.astro)

- `LERP_FACTOR` — higher = snappier follow, lower = heavier cinematic lag.
- `DWELL_PEAK` / `DWELL_WIDTH` — how hard and how wide the film "parks" at overlays.
- `DPR` cap — raise toward 2 only if frame sources exceed the canvas resolution.
- Frame quality/size — re-run the extraction pipeline (see README) and keep WebP.

## Known limits

- Source videos are ~720p: that, not the engine, is the sharpness ceiling. HD
  sources require the windowed decoder branch (research doc §8).
- Wix SSR TTFB ~880 ms and platform-injected analytics/cookies are outside this
  repo's control.
- iOS Low Power Mode halves rAF to 30 fps and cannot be detected or mitigated.

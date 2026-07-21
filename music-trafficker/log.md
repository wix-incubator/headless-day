# Build log — Music Trafficker disco ball

Date: 2026-07-09

## Update 4 (same day): discussion popup + members

- Installed **Wix Blog** + **Wix Members Area** apps (apps-installer API), seeded one published post "What do you think of AI music?" (id `7ed6fe11-3420-4585-9a20-56b61cf03626`).
- New `/api/thread` route: GET lists comments (public, newest first, author names via `@wix/members`), POST creates a comment (member-gated, 401 for anonymous). Comments key on the **post id** — this fresh Blog V3 site has no `referenceId` (that field only exists on legacy-migrated posts); verified by creating/listing/deleting a probe comment via REST.
- UI: "What do you think of AI music?" button under the ball → translucent popup (composer when logged in, login CTA otherwise); log in/out chip top-right using the built-in `/api/auth/*` routes. Disco ball behavior untouched.
- **Verified**: popup + empty thread + anon-post rejection live (desktop & 390×844); login link reaches the Wix-hosted login/signup dialog. **Not verified end-to-end**: posting as a logged-in member — Wix signup requires solving a reCAPTCHA, which an automated agent can't (and shouldn't) do. The comment write path itself was verified at the API level; if member posting misbehaves, check Blog comment moderation settings in the dashboard first.

## Update 3 (same day): natural-speed previews

User feedback: fast storyboard playback looked sped-up (frames are ~2 s apart in the source), slow playback looked laggy. Fix is two-tier:
- **Real motion**: 18/30 videos have YouTube `an_webp` hover previews (~3 s of consecutive frames @ ~10 fps). Proxied via `/api/motion-preview`, decoded client-side with `ImageDecoder` (Chromium; falls back below elsewhere) into 160×90 atlases, played at natural speed.
- **Crossfade**: remaining videos (and non-Chromium browsers) show storyboard frames that hold ~1.3–2.2 s and dissolve into each other via a small shader — no hard cuts.
Also fixed a stale-CDN issue: an early release let `/api/videos` be cached for 1 h; the client now uses a versioned URL (`?rev=2`).

## Update 2 (same day): animated tiles + live feed

- **Animated previews**: every window now plays its video as a muted 160×90 fast-forward loop, built from YouTube storyboard sprite sheets (one 5×5 sheet per video, animated by UV offsets — no decoding, works in all browsers). Watch pages turned out to be bot-walled from the Wix datacenter egress (consent/captcha stub, verified with a temporary debug endpoint), so the signed sheet URLs are resolved at build time from this machine into `src/server/storyboard-snapshot.json` (`scripts/resolve-storyboards.mjs`) with live resolution kept as a fallback for post-deploy videos. Sheets are proxied via `/api/storyboard-image` (upstream has no CORS headers). Verified live: 30/30 videos animated.
- **Auto-update**: feed cache dropped to 15 min; the client polls `/api/videos` and hot-swaps added/removed videos into the ball without remounting the scene (swap deferred while a video is playing/flying). New videos appear at most ~20 min after publish — but animate only after the next snapshot refresh + deploy (static thumbnail until then). If YouTube storyboard signatures ever expire, affected tiles silently fall back to static thumbnails.
- **Fix (user report)**: mirror facets could poke through video windows — the radius jitter reached the window plane height. Jitter now clamps every facet below the window backings.

## What was set up

- **Wix Headless site + Astro project** scaffolded with `npm create @wix/new@latest` (business name "Music Trafficker", blank template). Site id `4df484c7-bb1c-4d2f-990f-0ddf48f7b1ea`. The scaffold's own git-commit step failed (no global git identity on this machine) — expected; fixed with a repo-local `git config`.
- **Wix agent skills** installed into `.agents/skills/` via `npx skills add wix/skills`.
- **3D deps**: `three@0.162`, `@react-three/fiber@8.18`, `@react-three/drei@9.122` (React 18 pins), `@react-three/postprocessing@2.16.3` + `postprocessing@6.35.2` (pinned — newer versions require three ≥ 0.168).
- **YouTube feed**: `src/pages/api/videos.ts` server route; parses the channel's `/videos` tab (`ytInitialData`, full videos only, durations included), RSS + `/shorts/` probe as fallback, 1 h in-memory cache. Channel id resolved once: `UC5D9N79IcFdrPGoymBThZZA`. 30 full videos found; Shorts (e.g. the "Simulated Universe" series) excluded by source.
- **Scene**: `src/components/disco/` — instanced mirror ball with ~82 thumbnail windows, orbiting spotlights, lightformer env-map, sparkles, bloom/vignette, time-based tile→fullscreen flight animation, YouTube iframe overlay, Escape/✕ to close, drag-to-orbit.
- **Deployed** with `wix build` + `wix release` → https://music-traf-ab6ea66c-vytenisu.wix-site-host.com

## Bugs found & fixed during browser verification

- Window planes invisible: the dark backing boxes' front faces sat 0.01 world units *in front of* the window planes (occluding them), which masked a second, opposite orientation bug during diagnosis (three.js `Object3D.lookAt` for non-cameras points +Z *at* the target, so tangent planes need a `rotateY(π)` flip). Fixed both.
- `GL_INVALID_VALUE: glTexSubImage2D` warnings when the flyer upgraded to the hi-res thumbnail: swapping a larger image into an already-uploaded texture resizes immutable GPU storage. Fixed by giving the flyer a fresh `THREE.Texture` per flight/upgrade and disposing the old one.
- Redundant `allowFullScreen` attribute warning on the iframe — removed (the `allow` list already grants fullscreen).

## Verified (chrome-devtools MCP, local + live)

- Ball spins with thumbnails visible, ~60 fps feel, desktop (1280×800) and mobile (390×844) — whole ball fits on both (camera distance adapts to aspect).
- Click on a tile → tile flies smoothly to a letterboxed fullscreen rect → YouTube iframe fades in → video plays **from 0:00 with sound** (verified via progressing video frames and the player's `[music]` caption; autoplay-with-sound worked in the test browser).
- ✕ / Escape closes: iframe removed (audio stops), tile flies back, ball resumes spinning.
- Console: no errors from site code. Two external notes below.

## Known notes / unresolved

- **`frog.wix.com` beacon** (Wix's own BI telemetry, plain-HTTP) is refused on this office network → one `ERR_CONNECTION_REFUSED` console error that is not from site code and is environment-specific.
- **`releasePointerCapture` errors seen during verification only** — an artifact of the *synthetic* pointer events used to drive the canvas from DevTools; real mouse/touch input doesn't produce them.
- **Autoplay with sound on real mobile devices** may still be blocked by stricter browser policies (the user then just taps the play button in the player). Desktop Chrome played with sound.
- YouTube page-markup parsing could break if YouTube changes `ytInitialData`/`lockupViewModel`; the RSS fallback keeps the site functional (latest 15 videos) if that happens.

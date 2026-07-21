# Music Trafficker — Disco Ball

A single-page 3D experience for the [@MusicTrafficker](https://www.youtube.com/@MusicTrafficker) YouTube channel, built on [Wix Headless](https://dev.wix.com/docs/go-headless) (Astro + React + three.js).

A giant mirror ball spins in a dark club. Its windows are live thumbnails of the channel's videos — click one and it flies out of the ball into a fullscreen player that starts the video from the beginning, with sound. Close it and the tile flies back into the ball.

**Live site:** https://music-traf-ab6ea66c-vytenisu.wix-site-host.com

## Stack

- **Astro 5** + `@wix/astro` (Wix-managed hosting, server routes)
- **React 18** island with **three.js** via `@react-three/fiber` + `@react-three/drei`
- Bloom/vignette via `@react-three/postprocessing`
- YouTube IFrame embed for playback

## How the YouTube feed works

`src/pages/api/videos.ts` is an Astro server route (`GET /api/videos`). No YouTube API key is used:

1. **Primary source** — it fetches `https://www.youtube.com/@MusicTrafficker/videos` and parses the `ytInitialData` JSON embedded in the page. The `/videos` tab lists **full videos only** (Shorts live in a separate tab), includes durations, and returns ~30 items.
2. **Fallback** — if parsing fails (YouTube markup change, consent wall), it falls back to the channel RSS feed (`youtube.com/feeds/videos.xml?channel_id=…`, latest ~15 items). Because RSS mixes in Shorts, each item is probed with a `HEAD` request to `/shorts/<id>` — a `200` there means it's a Short and it gets dropped.
3. Anything shorter than 90 seconds is also filtered out, results are cached in memory for 1 hour, and the response carries `Cache-Control: s-maxage=3600`.

Tiles first load `i.ytimg.com/vi/<id>/mqdefault.jpg` thumbnails, then upgrade to **animated previews**; the fullscreen flyer upgrades to `maxresdefault.jpg` when available.

### Animated tile previews

Every window on the ball *plays* its video, muted, at low resolution. Two sources, best available wins:

1. **Real motion (`an_webp` hover previews)** — ~3 s of consecutive real frames at ~10 fps, the clips YouTube shows on thumbnail hover. Available for most (not all) videos; URLs come from the channel page and are proxied via `GET /api/motion-preview?v=<id>`. The client decodes the animated WebP with the `ImageDecoder` API (Chromium) into a 160×90-cell atlas and plays it at its natural framerate.
2. **Storyboard crossfade** — fallback for videos without a hover preview and for browsers without `ImageDecoder`. Storyboard frames are ~2 s apart in the source, so instead of hard cuts (which read as sped-up or laggy) each frame holds ~1.3–2.2 s and dissolves into the next via a small crossfade shader.

Storyboard sprite sheets are the seek-preview images every video has: one 800×450 sheet is a 5×5 grid of 160×90 frames sampled across the whole video — a ready-made flipbook atlas.

- The sheet URL (signed) comes from the watch page's `playerStoryboardSpecRenderer.spec`. Watch pages are bot-walled from datacenter IPs, so specs are resolved **at build time** from a developer machine into `src/server/storyboard-snapshot.json` (`node scripts/resolve-storyboards.mjs`); the runtime falls back to live resolution only for ids missing from the snapshot (e.g. videos published after the last deploy — those show static thumbnails until the next snapshot refresh).
- `GET /api/storyboard-image?v=<id>` proxies the sheet bytes (i.ytimg.com sends no CORS headers, so the browser can't texture from it directly) with a long CDN cache.
- The client loads each sheet as one texture and animates it by shifting UV offsets over the grid (~8–12 fps, staggered per video) — zero per-frame uploads or decoding.

### Discussion thread ("What do you think of AI music?")

A button under the ball opens a translucent popup with a single discussion thread, newest messages first. It's backed by real Wix modules:

- **Wix Blog** hosts one seeded post ("What do you think of AI music?"); **Wix Comments** stores the messages, keyed to that post (on fresh Blog V3 sites comments key on the post id — `referenceId` only exists on legacy-migrated posts).
- `GET /api/thread` — public read (`comments.listCommentsByResource`, `NEWEST_FIRST`) + current-member info; `POST /api/thread` — member-gated (`members.getCurrentMember` → `comments.createComment` with a Ricos body).
- Login/logout use the built-in `@wix/astro` routes (`/api/auth/login`, `/api/auth/logout`) — the Wix-hosted login page registers new members too. A chip in the top-right shows the state.
- **Wix Members Area** app is installed so commenter names/avatars resolve.

### Live feed auto-update

The server re-scrapes the channel every 15 minutes; the client re-polls `/api/videos` (every 10 s until all storyboards are attached, then every 5 minutes) and hot-swaps new videos into the ball without remounting the scene — a swap is deferred while a video is playing.

## The 3D scene

`src/components/disco/DiscoScene.tsx`:

- ~1,100 instanced mirror facets + ~82 "video window" planes distributed over latitude bands of the sphere (each of the ~30 videos appears 2–3 times).
- Orbiting colored spotlights, an emissive-lightformer environment map for reflections, particle sparkles, bloom + vignette.
- All animation is time-based (`delta`-driven), so it is framerate-independent.
- Click → the tile's world transform is captured and a 16:9 "flyer" plane interpolates position/rotation/scale to a rect that exactly matches the letterboxed frame the fullscreen player will use, while the thumbnail un-crops from window aspect to full 16:9. When it arrives, the DOM overlay with the YouTube iframe fades in (`autoplay=1&start=0`, sound allowed because it follows a user gesture). Closing reverses the flight.
- Drag to orbit the ball manually (OrbitControls, rotation only).

## Develop

```bash
npm install --ignore-scripts   # sharp's native build is dev-only dead weight; skip it
npm run dev                    # wix dev → http://localhost:4321
```

Prefix commands with `AI_AGENT=claude` (or run interactively) when using the Wix CLI from an agent.

## Build & deploy

```bash
npm run build     # wix build
npx wix release   # publishes to Wix hosting, prints the live URL
```

The site and hosting are managed by Wix; `wix.config.json` carries the site/app ids. `.env.local` (gitignored) holds the CLI-managed OAuth secret — never commit it.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.

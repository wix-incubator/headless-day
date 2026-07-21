# Scroll-Driven Animation: State of the Art (2024–2026)

Research synthesis on building fast, smooth, HD scroll-driven image-sequence animations
on the web. Compiled from ~60 primary sources (web.dev, Chrome/WebKit dev blogs, GSAP
docs, CSS-Tricks, Awwwards case studies, library source/issues) plus benchmarks run on
this repo. See [performance-playbook.md](./performance-playbook.md) for how this site
applies these findings.

## TL;DR verdict

**Canvas + image sequence is still the industry-standard technique** for photo-real
scroll films — it's what Apple product pages, GSAP's official helper, and
Awwwards-level studios use. But "fast + smooth + HD" is only achievable with a
specific architecture, because naive full pre-decoding physically cannot do HD:

- A decoded 1920×1080 frame costs `1920 × 1080 × 4 bytes ≈ 7.9 MB` of RAM.
- 120 fully-decoded HD frames ≈ **950 MB** — iOS kills the whole page at roughly
  350–450 MB on mid-tier iPhones.
- Therefore HD requires **windowed decoding**: keep compressed bytes for all frames,
  hold only ~15–20 decoded frames around the current scroll position, release evicted
  frames with `ImageBitmap.close()`.

The emerging alternative for HD payloads is a **WebCodecs pipeline** (ship one
inter-frame-compressed MP4, decode client-side into the same bitmap cache) — a 3–5×
payload reduction at the cost of real engineering complexity.

## 1. The consensus architecture

Every authoritative source converges on the same skeleton:

```
wrapper (400–600vh scroll runway)
└── stage (position: sticky; top: 0; height: 100vh/100svh)
    └── <canvas> (viewport-sized, DPR-aware backing store)
```

- **Scroll → progress → frame index**:
  `progress = scrollTop / (scrollHeight - windowHeight)`,
  `frame = min(frameCount - 1, floor(progress * frameCount))`.
- **Never scroll-jack.** Read native scroll; don't replace it. Breaks accessibility,
  momentum scroll, and OS gestures (GSAP community's own explicit warning).
- **Never redraw inside the scroll event.** A passive scroll listener only records a
  target value; a persistent `requestAnimationFrame` loop interpolates toward it and
  draws **only when the frame index actually changes**.
- **Smoothing (lerp/damping)**: `current += (target - current) * damping`. Lower
  damping = heavier cinematic feel; `damping = 1` (instant) is the correct value for
  `prefers-reduced-motion`. GSAP's official `imageSequenceScrub` helper notably does
  NOT lerp (1:1 mapping + `ease: "none"`); the numeric-scrub / lerp feel is a
  production-polish choice, not a correctness one.
- **Never swap `<img>` tags** for sequences — each `src` change re-decodes and causes
  visible flashing. Canvas + pre-decoded `ImageBitmap`s avoid this entirely.
- **`prefers-reduced-motion`**: show a static hero frame, skip the scrub.
- Place the sequence below the initial viewport where possible to buy preload time;
  preload enough frames for first paint, stream the rest in the background.

## 2. Image format & sizing

| Format | Payload | Decode speed | Verdict for sequences |
|---|---|---|---|
| AVIF | smallest (~35% under WebP) | **slow** (AV1 complexity) | risky — decode cost is paid per frame during interaction |
| **WebP** | middle | **fast** | ✅ consensus default for large sequences |
| JPEG | largest | fastest | acceptable fallback; no alpha |

- In a scrub, *decode* cost dominates because hundreds of decodes happen during
  interaction — AVIF's download win is offset by its decode penalty. Sources
  consistently lean WebP for big sequences.
- Quality equivalence (industrialempathy.com, DSSIM-measured): JPEG q70 ≈ AVIF q56 ≈
  WebP q72; JPEG q80 ≈ AVIF q64 ≈ WebP q82.
- **Resolution per device**: HD (1080p / viewport-matched) desktop, ~720p or less
  mobile. Apple serves a drastically reduced mobile experience (AirPods Pro page:
  55.8 MB desktop vs 2.6 MB mobile) and skips every other frame on the Vision Pro
  page to halve asset count.
- No published per-frame KB target exists; teams tune against LCP/INP budgets.
  Directional figures: 60-frame 1080p WebP sequence ≈ 3–5 MB total.

## 3. Memory: the binding constraint (iOS Safari)

- Decoded frame cost: `width × height × 4` bytes RGBA. 1080p ≈ 7.9 MB/frame.
- Canvas ceiling on Safari: 4096×4096 (~64 MB backing store per canvas).
- Page JS/heap budgets by device (Catch Metrics WebKit deep-dive): iPhone 8/X
  ~300–350 MB, iPhone 11/12 ~350–400 MB, iPhone 13/14 ~400–450 MB, iPhone 15+ ~1 GB+.
- WebKit memory-pressure cascade: at **50%** of limit → cache cleanup; at **65%** →
  destroys decoded image data, font caches, JIT code; at **100%** → page kill/reload
  (visible crash).
- Practical ceiling: **~15–20 fully-decoded 1080p frames** on constrained mobile
  Safari (extrapolated from the math above — validate per device, but the order of
  magnitude is firm).

**Mitigations (in order of leverage):**
1. Windowed/lazy decoding — sliding decoded window around scroll position; keep
   compressed blobs for everything else.
2. Manual release: `ImageBitmap.close()` / `VideoFrame.close()` on eviction. Never
   rely on GC — decoded frames are GPU-backed.
3. Nearest-decoded-frame fallback during fast flicks — draw the closest available
   frame rather than stalling on a decode.
4. Cap `devicePixelRatio` (≤2 desktop, ≤1–1.5 mobile). Full 3× retina rendering
   triples pixel throughput for sharpness nobody perceives mid-scroll.

## 4. Decode & render pipeline

- `createImageBitmap()` is the right decode primitive; browsers already decode
  off-main-thread internally, so decoding *inside a Worker* adds little for plain
  images (the measured ~4× OffscreenCanvas-in-worker win applies to *rendering*
  under main-thread contention, not decode).
- `ImageDecoder` (WebCodecs family) is Chromium-solid but Safari support only
  completes around iOS 26 — progressive enhancement only, not baseline.
- OffscreenCanvas + Worker: an optimization for main-thread-constrained WebGL scenes,
  not a default. Gotchas: Safari shipped 2D-in-worker (16.4) before WebGL-in-worker;
  `contextlost` recovery needed under memory pressure; input events still arrive on
  the main thread; no automatic background-tab rAF throttling in workers.

## 5. Alternatives compared

| Approach | Payload | Smoothness | Verdict |
|---|---|---|---|
| **Canvas image sequence + windowed decode** | medium (4–8 MB HD) | excellent, all devices | ✅ default choice |
| `<video>` + `currentTime` scrub | small — but all-keyframe encoding inflates ~6×+ | choppy Firefox/Android; iOS quirks | ❌ compatibility fallback only |
| **WebCodecs pipeline** (one MP4 → client-side decode → bitmap cache) | smallest (real inter-frame compression) | excellent once decoded | ⚠️ emerging 2026 recommendation; needs `mediabunny`-style demuxing + strict `close()` discipline |
| WebGL / three.js textures | same as frames | same | only if you need shader effects (grading, masks, 3D moves); use `texSubImage2D`, never re-allocate |
| CSS scroll-driven animations (`animation-timeline`) | — | compositor-thread, immune to main-thread jank | can't drive canvas frames; ideal for surrounding chrome (parallax, reveals, progress bars); Firefox still flag-gated |
| Lottie / Rive | — | — | vector-only; irrelevant for photographic content |
| Animated AVIF / APNG | — | — | no motion compensation; loses to real video beyond a few seconds |

### Why `<video>` scrubbing fails

Seeking to a delta frame forces the decoder back to the nearest keyframe and through
every intervening frame. Fixes require dense keyframes: measured file-size penalty at
keyframe-interval 5 vs 100 is already ~5.8× (MP4) — all-intra (`-g 1`, required by
scrolly-video's fallback) is worse. Even then Android stays laggy, Firefox needs
~2-frame intervals, and `playbackRate` tricks can't scroll backwards.

### The WebCodecs upgrade path

Ship one small MP4 → demux (`mediabunny`) → `VideoDecoder` → sliding `VideoFrame`
buffer → same canvas render loop. Breaks the payload-vs-smoothness tradeoff.
Browser support ~92% in 2026: Chrome 94+, Firefox 130+, Safari 16.4+ has the
video-decode pieces (full parity Safari 26). Codec note: prefer H.264/HEVC for Apple
hardware (iOS AV1 hardware decode is only ~33% of sessions). Non-negotiable:
`frame.close()` on every evicted frame — decoded frames hold GPU memory and leak
catastrophically otherwise.

## 6. Framework notes

- **GSAP ScrollTrigger** (100% free since April 2025, Webflow-owned): the de facto
  tooling. Production guidance: `scrub: <number>` (0.3–1s catch-up) + `ease: "none"`
  on the tween; `pin: true` over `position: sticky` for cross-browser consistency;
  never animate the pinned element itself, only children.
- **Lenis** (~3 KB): syncs native scroll into a rAF cadence; helps canvas scrub by
  removing scroll-event/rAF timing jitter. Not scroll-jacking — it reads native
  scroll.
- **Compositing pitfalls**: `backdrop-filter` layered over an animating canvas is
  expensive (mobile handles ~3–5 simultaneous blurs); indiscriminate `will-change`
  causes GPU memory pressure; a parent with `opacity < 1` becomes a new backdrop
  root and silently changes what `backdrop-filter` blurs.

## 7. Mobile gotchas (all approaches)

- **iOS Low Power Mode throttles rAF to 30 fps and is undetectable** from web
  content. No workaround exists; affects canvas, video, and WebCodecs equally.
- iOS `<video>` needs both `muted` and `playsinline` for any autoplay-adjacent
  behavior.
- Test on mid-tier Android and older iPhones — "works on a MacBook Pro and dies on a
  mid-range Android" is the recurring failure mode.
- Debounce resize handling: mobile URL-bar show/hide fires viewport changes
  constantly during scroll (use `100svh`, not `100vh`).

## 8. Benchmarks from this repo

A windowed-decoder variant of this site's engine (branch
`feat/windowed-frame-decoder`, parked) was benchmarked against the shipped
decode-everything engine using headless Chrome driven at fixed scroll speeds
(rAF-delta percentiles, two passes: ~1300 px/s and ~5300 px/s):

- Frame-time parity in every run: **8.3 ms p50** for both engines at 720p and with
  synthetic 1080p frames (≈120 fps headroom).
- Memory: windowed engine holds **16 decoded frames/zone** (vs 240 total decoded),
  bounding decoded memory at ~130 MB even for full-HD sequences — inside every
  device budget in §3.
- Conclusion: windowed decoding costs nothing in smoothness and is the prerequisite
  for serving true 1080p frames. The current 720p-sourced site doesn't need it;
  HD sources would.

## Key sources

- GSAP `imageSequenceScrub` helper & ScrollTrigger docs — gsap.com
- CSS-Tricks: Apple-style scrolling animations; Vision Pro CSS recreation
- web.dev: AVIF updates, canvas hi-DPI; industrialempathy.com quality-settings study
- PQINA: canvas memory limits; Catch Metrics: WebKit RAM deep-dive
- muffinman.io: video scrubbing keyframe benchmarks; ghosh.dev: frame-extraction timings
- lionkeng: WebCodecs scroll-sync tutorial; mediabunny.dev; scrolly-video (GitHub)
- caniuse/WebKit release notes: WebCodecs, `animation-timeline`, OffscreenCanvas
- Awwwards case studies: Orage, Working Stiff Films, MindMarket

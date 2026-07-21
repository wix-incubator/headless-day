# Birdie Surf Travel — Art Direction Spec

**For:** implementing engineer · **Date:** 2026-07-11
**Contract:** `docs/brand/2026-07-11-brand-brief.md` — every choice below traces to it.
**Ordered by visual ROI.** Ship items 1–7 in order; `[STRETCH]` items only after all `[CORE]` acceptance criteria pass.

---

## 0. Global rules (read first)

### Palette (single source of truth)

| Token | Hex | Use |
|---|---|---|
| `--ocean-deep` | `#157A96` | Globe ocean base |
| `--swell` | `#2490A8` | Swell-line arcs on ocean |
| `--reef` | `#58D3C7` | Shallow lagoon rim, wave water bands |
| `--foam` | `#FFFDF7` | Coast trim, wave crests, clouds, cards (existing `--card`) |
| `--land` | `#8FD07E` | Primary land green (warmed from `#8ED081`) |
| `--land-2` | `#5FB56E` | Secondary green splotches |
| `--sand` | `#F2D8A7` | Desert bands, beaches |
| `--ice` | `#FFFDF7` | Polar caps (reuse foam) |
| `--sky-top` | `#9ADBE8` | Sky gradient top |
| `--horizon` | `#FFE3C2` | Sky gradient bottom, sun halo |
| `--sun` | `#FFD166` | Sun disc, active states (existing) |
| `--coral` | `#FF7E6B` / `--coral-deep` `#E85F4C` | CTA, Nalu's board, accents (existing) |
| `--ink` | `#14353E` | Outlines, text, Nalu's head/neck/bill (existing) |
| Nalu body | `#9C8B72` | Warm taupe |
| Nalu cheek | `#F5E2B8` | Buff patch + neck chevrons |
| Nalu chest | `#F7EFDD` | Toned cream (not pure foam — avoids glow) |
| Nalu wing | `#8D7F63` | Slightly darker than body |

### Toon shading
One shared 3-step `gradientMap` for every `MeshToonMaterial` in the scene: `THREE.DataTexture` 3×1, values `[96, 176, 255]`, `NearestFilter` both, `needsUpdate = true`. No other lighting tricks, no custom shaders anywhere in this spec.

### Units & interfaces
All sizes in **globe-radius units** (globe radius = 1) unless marked "local" (inside a scaled group). Do not touch: `latLngToVec3`, camera `z=3.2 fov 50`, the nested rotation rig, machine state names. All transient animation phases (`landing`, `takingOff`, `celebrating`) live in scene components as refs/timelines triggered by observing state transitions (`prev → next` in a `useRef`), never as machine states.

### Reduced motion
The scene already receives `animate: boolean` (wired to `prefers-reduced-motion`). Every animation below lists its degraded form; when `animate === false` **nothing moves continuously** — poses are static, transitions are ≤300ms opacity/position eases, particles never spawn. CSS side: the existing `@media (prefers-reduced-motion: reduce)` kill-switch stays.

### Easing library (implement once, `src/scene/ease.ts`)
| Name | Formula | CSS equivalent |
|---|---|---|
| `easeOutCubic` | `1-(1-t)^3` | `cubic-bezier(.33,1,.68,1)` |
| `easeInOutCubic` | `t<.5 ? 4t³ : 1-(-2t+2)³/2` | `cubic-bezier(.65,0,.35,1)` |
| `easeInQuad` | `t²` | `cubic-bezier(.11,0,.5,0)` |
| `easeOutBack` | `1+2.7(t-1)³+1.7(t-1)²` | `cubic-bezier(.34,1.56,.64,1)` — "springy", the brand ease |
| `easeInOutSine` | `-(cos(πt)-1)/2` | `cubic-bezier(.37,0,.63,1)` |

### Budgets
Globe sphere 48×32 segments (~3k tris). Whole scene ≤25k tris, ≤90 draw calls, dpr `[1,2]` unchanged. Texture canvas 2048×1024 desktop, 1024×512 when `window.innerWidth < 720` or `dpr === 1`. Particle meshes pooled (12 max), never allocated per burst.

---

## 1. Earth globe — recognizable continents `[CORE]` (owner must-have #2)

**Technique — one approach, no alternatives:** paint an equirectangular map onto an offscreen `<canvas>` from bundled landmass polygon data; apply as `CanvasTexture` on the existing ocean sphere's `MeshToonMaterial.map` (material `color: '#FFFFFF'` so the map reads true). Delete the six `Blob` continents entirely.

### 1a. Data
- New file `src/data/landmass.ts`: `export const LAND: [number, number][][]` — array of polygon rings, each ring an array of `[lng, lat]` pairs. Derived offline (one-time script, not shipped) from **Natural Earth 110m land** (public domain), simplified to **≤3,500 total points**, dateline-split (no ring crosses ±180°). Commit the TS file; zero runtime fetches. This is coordinate data, not a texture file — within constraints.
- Also export `export const ISLANDS: { lat: number; lng: number; r: number }[]` — hand-placed dots for chains 110m drops: Hawaiian chain `{21.3,-157.9,r:5}`, `{20.8,-156.3,r:4}`, `{19.6,-155.5,r:6}`, `{22.1,-159.5,r:3}` (r in px at 2048 canvas). Verify Bali/Indonesia, Portugal, Morocco, Costa Rica, South Africa coastlines survive simplification — every destination pin must sit on painted land.

### 1b. Projection & UV alignment (load-bearing — read twice)
Draw a **standard equirectangular** canvas: `x = (lng + 180) / 360 * W`, `y = (90 - lat) / 180 * H`. Then on the texture set:
```ts
texture.wrapS = THREE.RepeatWrapping;
texture.offset.x = 0.25;           // aligns lng 0 with latLngToVec3's +Z convention
texture.colorSpace = THREE.SRGBColorSpace;
```
(Derivation: `latLngToVec3` puts lng 0 at +Z; three.js `SphereGeometry` puts u=0.25 at +Z. Standard equirect puts lng 0 at u=0.5; offset 0.25 reconciles.) For strokes that bleed across the seam, draw the whole map twice more translated ±W before reading pixels — or simply begin all paths with `ctx.translate(±W,0)` repeats.

### 1c. Paint order (exact recipe, px at 2048×1024 — halve everything at 1024)
1. **Deep ocean fill:** `#157A96` full canvas.
2. **Swell lines** (brief §3.1 — THE aerial surf image): build one `Path2D` of all land rings + island circles. Stroke it four times, widest first, `lineJoin:'round'`:
   - width 150 → `#2490A8` at alpha 0.35
   - width 116 → `#157A96` (knocks back to base — creates the gap)
   - width 82 → `#2490A8` at 0.55
   - width 48 → `#157A96`
   Result: two concentric lighter arcs wrapping every coast, ~15px bands with ~20px gaps — corduroy from the air.
3. **Reef shallows** (brief §3.4): stroke width 30 → `#58D3C7` alpha 0.8; stroke width 18 → `#58D3C7` alpha 1.
4. **Foam trim** (brief §3.5): stroke width 5 → `#FFFDF7`.
5. **Land fill:** `#8FD07E` all rings (`evenodd`), plus `ISLANDS` as filled circles (each island also gets its own steps 2–4 strokes, scaled down: widths 40/30/22/12, reef 10/6, foam 3).
6. **Sand bands:** with `globalCompositeOperation = 'source-atop'` (clips to land), fill two horizontal gradients: lat 33°N→12°N and 12°S→33°S, `#F2D8A7`, alpha ramp 0→0.9→0 over each band (soft edges ≥40px). Sahara, Arabia, Australian interior go sand for free.
7. **Second green:** still `source-atop`, ~28 seeded-random soft ellipses (radius 25–70px, fixed seed 7) in `#5FB56E` alpha 0.5, latitudes −55°…60° — hand-carved variety, deliberate asymmetry (brief: never an asset pack).
8. **Ice caps:** `source-atop`, fill `#FFFDF7` poleward of ±66° with a 30px soft alpha edge. Antarctica + Greenland read instantly.
9. Reset composite. Done — build once at mount, `CanvasTexture`, dispose canvas.

Bump the globe sphere to `sphereGeometry args={[1, 48, 32]}` for a clean silhouette.

**Swell drift `[STRETCH]`:** two extra transparent spheres r=1.004 and r=1.008 (`depthWrite:false`), each textured with *only* the step-2 arc strokes at two phase offsets (widths 150/82 vs 116/48). Cross-fade opacities `A = 0.30 + 0.30·sin(2πt/7s)`, `B = 0.60 − A` — arcs appear to migrate shoreward. `animate===false`: omit both spheres (baked static arcs remain).

**Acceptance (screenshot-check):**
- From intro camera, rotating the globe: Africa, Australia, and the Americas are nameable by a stranger in 2 seconds; Hawaii is a visible dot chain in the Pacific.
- Every destination pin base touches painted land; the Oahu pin sits on a Hawaii dot.
- Every coast shows, outermost→in: two lighter blue arcs → turquoise rim → cream trim → land. No hard texture seam anywhere (spin 360° to verify).
- Sahara/Australia read sand; poles read ice; no continent is a uniform single green.

---

## 2. Golden-hour atmosphere `[CORE]`

### 2a. Sky gradient
Remove `<color attach="background">`. Set Canvas `gl={{ alpha: true }}` and put the gradient on the container div behind it (cheapest possible sky):
```css
background: linear-gradient(180deg, #9ADBE8 0%, #C8E6DC 55%, #FFE3C2 100%);
```
Warm horizon below, cool sky above — the warm globe limb now separates from the cool sky (brief §5).

### 2b. Lighting rig (replace current two lights)
- `ambientLight` color `#CFEAE4` intensity 0.85 (cool fill).
- Key `directionalLight` position `[-3, 2.2, 2]` color `#FFDFAE` intensity 1.55 (low warm sun, upper-left).
- `[STRETCH]` rim `directionalLight` position `[1.5, 0.2, -3]` color `#FFC98A` intensity 0.5 (warm edge on the right limb).

### 2c. Sun disc
World-fixed (outside rig), upper-left, peeking past the globe: group at `[-1.35, 0.95, -1.4]`, facing +Z.
- Core: `circleGeometry r=0.20`, `meshBasicMaterial #FFD166`.
- Halo: `circleGeometry r=0.38`, `meshBasicMaterial #FFE3C2`, `transparent, opacity 0.35, depthWrite:false`.
No lens flares, no bloom (anti-goal: simulator).

### 2d. Clouds (replace current five gray pancakes)
Four clouds, each a 3-sphere puff in one group, color `#FFFDF7`, altitude radius **1.20** (well clear of the surface so they never read as continents — brief §5):
- center sphere scale `[0.10, 0.075, 0.09]`; two flankers scale `[0.065, 0.05, 0.06]` at local x ±0.085, y −0.01.
- Positions (lat, lng): `(18, -35)`, `(-28, 95)`, `(42, 170)`, `(-8, -120)`.
- Drift: group `rotation.y += dt * 0.015`. `animate===false`: static.

**Acceptance:** screenshot shows warm cream horizon vs cool top; sun disc + halo upper-left; globe's left limb warmer/brighter than right; exactly 4 clouds, clearly floating above the surface with visible gap, never mistakable for land.

---

## 3. Nalu rebuild `[CORE]` (brief §4 — "a specific bird, not a pebble")

Rewrite the `Bird` body. Keep group `position=[0, 0.18, 1.25]`, `scale=0.09`, existing roll/pitch steering. All dims below are **local units**. +X is forward.

### 3a. Primitive recipe (top→bottom)
| Part | Geometry | Local position | Scale/size | Color |
|---|---|---|---|---|
| Body | sphere r1 | `[0,0,0]` | `[1.5, 1.05, 1.1]` | `#9C8B72` |
| Chest | sphere r1 | `[0.55,-0.28,0]` | `[0.85, 0.7, 0.85]` | `#F7EFDD` |
| Tail (upswept) | cone r0.45 h1.0 | `[-1.45, 0.42, 0]`, rot z `+2.3rad` (tip up-back) | `[0.5, 0.9, 0.35]` | `#7E6F58` |
| Neck | cylinder r0.28 h0.62 | `[0.82, 0.48, 0]`, rot z `-0.45` (leans forward) | 1 | `#14353E` |
| Chevrons ×3 | torus r0.30 tube0.045 | on neck at local h −0.18, 0, +0.18; each rot x `π/2` + tilt z `0.26` (diagonal furrows) | 1 | `#F5E2B8` |
| Head | sphere r0.42 | `[1.18, 0.92, 0]` | 1 | `#14353E` |
| Cheek ×2 | sphere r1 | `[1.14, 0.84, ±0.33]` | `[0.22, 0.28, 0.12]` | `#F5E2B8` |
| Bill | cone r0.13 h0.34 | `[1.58, 0.86, 0]`, rot z `-π/2` | 1 | `#14353E` (nene bills are black — drop the orange) |
| Wing ×2 | cone r0.55 h2.1, flattened | see 3b | `[1, 1, 0.16]` | `#8D7F63` |
| Board (flight) | sphere r1 | `[0.1, -0.78, 0]`, rot z `-0.10` (nose up) | `[1.7, 0.09, 0.5]` | `#FF7E6B` |
| Board stripe | box | `[0.1, -0.69, 0]` | `[1.55, 0.02, 0.09]` | `#FFFDF7` |

No eyes at this scale — the buff cheek carries the face (anti-goal: googly eyes). `[STRETCH]`: 0.05 r bead eyes in `#0B2228`.

### 3b. Wings — out, tapered, flapping
Each wing: a group (the shoulder pivot) at `[-0.05, 0.35, ±0.60]`; inside, the flattened cone rotated so the tip points outward (+Z/−Z), cone base at the pivot, tip at |z| ≈ 2.1. Reads as a tapered plane.
- **Flap cycle** (`flying`/`approaching`, `animate===true`): shoulder `rotation.x = ∓(rest + A·sin(2π·3.0·t))`, rest `-0.10rad`, A `0.55rad` (≈ +26°/−38° swept). **Glide interludes:** every 2.4s of flapping, hold 1.4s at `-0.07rad` with a slow ±0.03 sine at 0.5Hz. Desync left/right by 0.02s for handmade feel.
- Landed: wings folded — shoulder `rotation.x = ∓0.9`, tucked against body.
- `animate===false`: frozen at glide pose.

### 3c. Altitude shadow (kills "pebble on a ball")
World-space (outside rig): `circleGeometry r=1` scaled 0.055, `meshBasicMaterial #14353E, transparent, opacity 0.16, depthWrite:false`, positioned each frame at `normalize(birdWorldPos) * 1.002`, oriented `lookAt(0,0,0)` then flipped outward. Scale ×`(0.18 / birdAltitude)` clamped [0.8, 1.6] — shadow grows/converges as Nalu descends.

### 3d. Personality motion
- **Banking:** raise roll target to `-input.dx * 0.65`, pitch `input.dy * 0.3` (keep k = dt·6 smoothing).
- **Approach wiggle** (on `flying → approaching`): roll ±0.14rad, 2 sine cycles over 0.5s, then normal. Head group tilts z `-0.12` toward the ground while `approaching`.
- `animate===false`: skip both.

**Acceptance:** side screenshot in flight shows: separated black head on a forward-leaning dark neck with 3 visible cream chevrons, buff cheek, upswept tail, both wings extended mid-flap, coral board tucked under belly, blob shadow on the globe directly below with visible daylight between bird and surface. A stranger says "goose", a birder says "nene".

---

## 4. Takeoff & landing choreography `[CORE]` (owner must-have #1)

Implemented as timelines inside `Bird` (plus a `TouchdownFX` sibling for particles), driven by `useFrame` clocks started on observed transitions. Machine untouched; transitions stay instant in state, **never** on screen.

### 4a. Landing (trigger: `approaching → landed`) — total 1.6s
Also on `LAND`: set store flight lat/lng to the destination's **touchdown coords** (table §5d) — the rig's existing `k = dt·5` lerp glides the globe into the postcard framing during descent, in sync.

| Phase | t | What | Easing |
|---|---|---|---|
| A — Bank & descend | 0 → 0.90s | Bird world y `0.18 → 0.02`; z `1.25 → 1.13`. Pitch: nose-down `+0.21rad` (0–0.55s) then flare to `-0.31rad` (0.55–0.9s). Wings: stop flapping, spread wide (`rotation.x = ∓0.02`), spread-fingers stretch scale z ×1.15. Shadow converges (auto via §3c). | position `easeInOutCubic`; pitch `easeOutCubic` per segment |
| B — Touchdown squash | 0.90 → 1.05s | Scale `[1.15, 0.72, 1.15]` at impact (0.90–0.96s) then rebound to `[0.97, 1.06, 0.97]` (0.96–1.05s). Wings snap to folded (`∓0.9`) over 150ms. | squash `easeInQuad`, rebound `easeOutBack` |
| C — Settle & plant | 1.05 → 1.60s | Scale eases to `[1,1,1]`. **Board plant:** board animates from under belly to planted: local position → `[-0.4, -0.9, 1.3]` (beside bird), rotation → nose-up 80° with an 8° handmade off-tilt, 250ms with `easeOutBack` overshoot. Pitch settles to 0. | `easeOutCubic` |

**Touchdown FX at t = 0.90s** (pooled meshes, `TouchdownFX`):
- **Feather/dust puff:** 6 spheres r 0.008–0.016 (globe units), colors 4× `#F5E2B8` + 2× `#FFFDF7`, burst from the contact point, initial radial speed 0.25 u/s with +0.15 upward bias, gravity −0.4 u/s², life 450ms, scale→0 and opacity→0 (`easeOutQuad`).
- **Splash ring** (all six destinations are coastal): ring/torus at the surface just seaward of the bird, `ringGeometry inner 0.9 outer 1.0` scaled `0.04 → 0.12` over 500ms, `#FFFDF7`, opacity `0.5 → 0`, `easeOutQuad`, `depthWrite:false`.

**Camera:** does not move — camera is a fixed interface; the rig glide + descent carry all the motion. `[STRETCH]` micro-shake: camera x/y offset ±0.008 decaying over 150ms at touchdown, exact return to origin; skipped when `animate===false`.

**UI:** hint toast/"press LAND" chip hides at t=0 (150ms fade). **Info card mounts at t = 1.05s** — touchdown first, paperwork second (component defers mount 1.05s after entering `landed`, then CSS entrance §6). Nalu speech bubble (if any) waits until 1.6s.

**Reduced motion:** single 300ms `easeOutCubic` descent (y 0.18→0.02, wings fold), no squash, no particles, card mounts at 300ms with 150ms opacity fade.

### 4b. Takeoff (trigger: `landed → flying`; also reused on `intro → flying`) — total 1.1s

| Phase | t | What | Easing |
|---|---|---|---|
| A — Crouch | 0 → 0.18s | Scale `[1.08, 0.80, 1.08]`; pitch nose-up to `-0.35rad` begins. **Board tuck:** board flips flat and returns under belly (200ms, `easeInOutCubic`). | `easeInQuad` |
| B — Leap | 0.18 → 0.55s | World y `0.02 → 0.24` (overshoots cruise); stretch scale `[0.95, 1.15, 0.95]`; first wing downstroke at 1.5× amplitude synced to the leap (downstroke completes at t=0.35s). 4 sand specks (`#F2D8A7`, r 0.008) kick backward, life 350ms. | `easeOutCubic` |
| C — Climb-out | 0.55 → 1.10s | y settles 0.24 → 0.18; scale → 1; pitch → 0; flap cycle blends to normal 3Hz. | `easeInOutSine` |

Flight input is **not** locked (nimble brand) — steering works from t=0; the visual completes regardless. **UI:** info card slides out at t=0 (200ms, reverse of entrance). **Reduced motion:** 300ms rise 0.02→0.18, wings to glide pose, no specks.

**Acceptance:** film both at 60fps. Landing: distinct nose-down descent → flare → visible squash → dust puff + expanding foam ring → board standing beside Nalu; info card enters only after the dust. Takeoff: visible crouch before the leap, big first downstroke, sand kick. Under `prefers-reduced-motion`, both complete in ≤300ms with zero particles and no scale distortion.

---

## 5. Markers → destination vignettes `[CORE]` (brief §3.2, §3.3, §3.8, §7)

Delete the lollipop pins. Each destination gets a **vignette group** at `latLngToVec3(lat, lng, 1.0)`, `lookAt` center (stack along −Z as today). Three parts:

### 5a. Surfboard pin
Board: sphere scaled to `[0.032, 0.10, 0.008]` (globe units: 0.10 long), planted nose-up along the surface normal, buried 0.015 (0.085 shows). Per-destination handmade tilt: 6–10° off-normal, each a different direction (use `destIndex * 2.4rad` around normal). Cream/ink center stripe: box `[0.006, 0.09, 0.009]`.

| Destination | Board | Stripe |
|---|---|---|
| oahu | `#FF7E6B` | `#FFFDF7` |
| bali | `#FFD166` | `#14353E` |
| ericeira | `#7FC9DC` | `#FFFDF7` |
| taghazout | `#F2D8A7` | `#E85F4C` |
| nosara | `#8ED081` | `#FFFDF7` |
| jbay | `#FFFDF7` | `#14353E` |

**Active state** (replaces yellow head-swell): board bobs ±0.008 at 1.2Hz + sand ring pulse — torus r 0.045 tube 0.004 `#FFD166`, opacity `0.55 → 0` & scale `1 → 1.5` looping 1.4s `easeOutQuad`. `animate===false`: static board + steady ring at opacity 0.4.

### 5b. Breaking wave (the product, visible from the sky)
Offset ~0.07 units toward the destination's water bearing (§5d):
- Water band: flattened sphere scale `[0.09, 0.05, 0.006]` in `#58D3C7`, lying on the ocean.
- Foam crescent: torus r 0.05, tube 0.006, `arc = π·0.55`, `#FFFDF7`, tangent to the band.
- **Peel animation:** crescent translates 0.045 along the band over 2.8s `easeInOutSine`, fades out over the last 20%, snaps back, loops. `animate===false`: static crescent at mid-band.

### 5c. Landmark (≤3 primitives, brief's exact list) — placed ~0.06 land-side of pin
| Destination | Build | Colors |
|---|---|---|
| oahu — Diamond Head | cylinder (r-top 0.02, r-bot 0.045, h 0.05) + crater disc r 0.02 on top | cone `#8FD07E`, disc `#F2D8A7` |
| bali — Uluwatu split gate | two tapered boxes `[0.014, 0.05, 0.014]` gap 0.018, + tiny box caps | pillars `#F2D8A7`, caps `#14353E` |
| ericeira — chapel | box `[0.028, 0.03, 0.028]` + cone roof r 0.022 h 0.022 | walls `#FFFDF7`, roof `#E85F4C` |
| taghazout — rock arch | half-torus r 0.03 tube 0.009, `arc = π`, planted upright | `#F2D8A7` |
| nosara — jungle tree | cylinder r 0.005 h 0.035 + 2 spheres r 0.018/0.013 stacked | trunk `#9C8B72`, canopy `#5FB56E`/`#8FD07E` |
| jbay — the point | long sand wedge box `[0.02, 0.008, 0.09]` along the coast + extra-long foam crescent (torus r 0.09, tube 0.005, arc π·0.4) peeling down it | wedge `#F2D8A7`, foam `#FFFDF7` |

Every landmark gets a deliberate 2–4° tilt (asymmetry = handcrafted, brief §2).

### 5d. Vignette table — bearings & touchdown coords
"Water bearing" = direction from pin to open ocean; wave sits that way, landmark opposite. **Touchdown** = where §4a parks the globe (Nalu on sand beside the pin, wave and landmark in frame).

| Dest | Water bearing | Wave offset (Δlat, Δlng) | Landmark offset | Touchdown (lat, lng) |
|---|---|---|---|---|
| oahu | N | `(+3.5, 0)` | `(-3, -1.5)` | `(20.2, -157.4)` |
| bali | SW | `(-2.5, -2.5)` | `(+2.5, +2)` | `(-7.5, 116.2)` |
| ericeira | W | `(0, -3.5)` | `(+1, +3)` | `(38.2, -8.2)` |
| taghazout | W | `(0, -3.5)` | `(+1, +3)` | `(29.8, -8.5)` |
| nosara | SW | `(-2.5, -2.5)` | `(+2, +2.5)` | `(10.8, -84.6)` |
| jbay | SE | `(-3, +2)` | `(+2.5, -2)` | `(-33.2, 24.1)` |

**Acceptance:** zoomed screenshot of each destination shows board pin (unique color, visibly tilted), turquoise band + white crescent offshore, landmark land-side — six distinguishable postcards. Landed screenshot at Oahu = brief §7 verbatim: Nalu on sand beside its planted coral board, Diamond Head behind, wave peeling offshore, warm key light from the left. This frame is the OG image — get sign-off on it before polishing anything else.

---

## 6. UI restyle deltas `[CORE]` — `src/styles/game.css` only, no relocation

1. **Tokens:** `--sky: #9ADBE8` (was `#8FE3DB`); add `--ocean: #157A96; --reef: #58D3C7; --horizon: #FFE3C2; --sky-top: #9ADBE8; --ease-spring: cubic-bezier(.34,1.56,.64,1); --ease-out: cubic-bezier(.33,1,.68,1);`
2. **Typography discipline (brief §6):** add `@import '@fontsource/fredoka/500.css'`. `.bb-btn, .bb-navtab, .bb-slot, .bb-day { font-weight: 500; }` · `h2, .bb-info h2, .bb-modal h2 { font-weight: 600; }` · body stays 400. No other font changes.
3. **Springy entrances (brief: quick, never ceremonial — all ≤300ms):**
   ```css
   @keyframes bb-slide-in { from { opacity:0; transform: translateX(24px); } }
   @keyframes bb-pop      { from { opacity:0; transform: translate(-50%,-50%) scale(.95); } }
   @keyframes bb-rise     { from { opacity:0; transform: translate(-50%,8px); } }
   .bb-info  { animation: bb-slide-in .3s var(--ease-spring) both; }
   .bb-modal { animation: bb-pop .22s var(--ease-spring) both; }
   .bb-toast, .bb-chip { animation: bb-rise .2s var(--ease-out) both; }
   ```
   (Info-card mount is deferred 1.05s by the component per §4a — CSS itself has no delay.) On mobile the `.bb-info` bottom-sheet variant animates `translateY(24px)` instead.
4. **Button feel:** `.bb-btn { transition: transform .12s var(--ease-out), box-shadow .12s var(--ease-out); } .bb-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 0 rgba(20,53,62,.3); } .bb-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(20,53,62,.3); }` Same for `.bb-land`.
5. **Fallback view:** `background: linear-gradient(180deg, var(--sky-top), var(--horizon))`.
6. Existing reduced-motion kill-switch already covers all of the above — leave it last in the file.

**Acceptance:** card/modal/toast each enter with a visible but sub-300ms spring; buttons depress on click; pills still legible on the new `--sky`; layout positions pixel-identical to the approved screenshots (right card / center modal / left navtab).

---

## 7. Confirmation celebration `[CORE hop / STRETCH postcard]` (the shareable beat)

Trigger: entering `confirmed`. If `bookingReturnTo === 'landed'` (grounded):
1. **Board raise** (0 → 0.25s): planted board flips up overhead — local `[0.1, 1.9, 0]`, held flat, `easeOutBack`.
2. **Double hop** (0.25 → 1.15s): two hops, each 450ms — up 0.05 world-units `easeOutCubic`, down `easeInQuad`, squash `[1.1,.85,1.1]` for 80ms on each land. Wings half-spread during hops.
3. **Spray burst** at first hop apex (t≈0.45s): 10 pooled spheres r 0.006–0.012 — 6× `#FFFDF7`, 3× `#FFD166`, 1× `#FF7E6B` (sea-spray palette; explicitly **not** rainbow confetti) — arc up/outward, speed 0.35 u/s, gravity −0.5, life 600ms, fade `easeOutQuad`.
4. Hold board overhead until `DONE`, then run takeoff §4b (board tucks during crouch).

If airborne (booked from `approaching`): skip hops; wings flare + spray burst only.
**UI:** ConfirmedCard pops via §6 `bb-pop`; `.bb-stamp` gets `transform: rotate(-6deg)` and one sun-ring pulse (box-shadow `0 0 0 0 → 0 0 0 12px` `#FFD16600`, 600ms, once).
**Reduced motion:** no hop/spray; board raise as 150ms fade-swap; card fades in.
**`[STRETCH]` postcard framing:** during `confirmed`, a screenshot-bait caption strip over the scene bottom-left: destination name + "Booked with Birdie" in Fredoka 600 on a cream chip — restyle only, no layout moves.

**Acceptance:** booking at a grounded destination shows: board overhead → two squash-hops → brief warm spray, all inside 1.2s, card already readable. Frame at t≈0.5s is share-worthy on its own.

---

## 8. Cut line

| # | Item | Tag |
|---|---|---|
| 1 | Globe texture: continents, shallows, foam, baked swell, sand/ice | **[CORE]** |
| 2 | Sky gradient, lighting rig, sun disc, 4 clouds | **[CORE]** (rim light STRETCH) |
| 3 | Nalu rebuild + shadow + flap/bank/wiggle | **[CORE]** (bead eyes STRETCH) |
| 4 | Landing + takeoff choreography, FX, card timing | **[CORE]** (camera micro-shake STRETCH) |
| 5 | Board pins + waves + landmarks + touchdown framing | **[CORE]** |
| 6 | CSS tokens, weights, entrances, button feel | **[CORE]** |
| 7 | Celebration hop + spray | **[CORE]** (postcard strip STRETCH) |
| — | Swell-drift overlay spheres (§1) | [STRETCH] |

Ship order = section order. If time runs out mid-5, priority inside it: pins → Oahu vignette complete (the OG shot) → remaining five vignettes.

---

## Addendum — 2026-07-12: three owner-requested visual upgrades

**Owner request date:** 2026-07-12. These layer on top of everything above — palette,
atmosphere, and choreography are unchanged; nothing in sections 0–8 was revised, only
extended.

### A. Nalu becomes a friendly toucan (name unchanged)

**Reference:** a cute Disney-style toy toucan figure (owner-provided image, red-cheeked,
oversized banana-yellow beak with a black tip, round black head/body, large cream face and
chest panel, big round dark eyes with a white highlight, orange feet, small black wings)
noted 2026-07-12.

`src/scene/Bird.tsx` was rebuilt to this read while keeping every existing contract: the
screen-fixed rig (`position=[0,0.18,1.25]`, `scale=0.09`), all choreography timelines
(flap/glide, banking, approach wiggle, landing/takeoff, celebration hop+spray), and the
coral surfboard accessory verbatim. Species-only copy changes ("nene" → "toucan") landed in
`src/ui/dialogue.ts`'s intro line, `src/pages/index.astro`'s meta description/H1/body copy,
and `README.md` — the name "Nalu" is untouched everywhere.

New proportions (toy/Disney-friendly, "head+beak ≈ 60% of total mass"):
- Body: a rounder, smaller torso than the old goose build (no upswept tail, no neck
  chevrons — a toucan's head sits almost directly against its body).
- Head: a big round black sphere with a large cream face/chest panel, big dark eyes (each
  with a small white highlight sphere), no separate "cheek" patches.
- Beak: the dominant feature — two overlapping cones (a long straight run from the face,
  then a shorter section angled further down) plus a small black-tip cone, all
  banana-yellow except the black tip, giving the "bent/lathed" down-curve the reference
  shows.
- Wings: the same shoulder-pivot flattened-cone rig, recolored black and sized down
  ("small wings").
- Feet: small orange tucked shapes near the belly, mostly hidden behind the board in flight
  (matches "orange feet tucked in flight").
- `public/og-image.png` was regenerated from the new intro scene (toucan, not the old bird).

### B. Country flags at every surf spot

`src/scene/flags.ts` (new) exports one pure canvas-drawing function per destination country
— US/Hawaii (`oahu`), Indonesia (`bali`), Portugal (`ericeira`), Morocco (`taghazout`),
Costa Rica (`nosara`), South Africa (`jbay`) — plus a `createFlagTexture(destId)` runtime
wrapper (128×80 canvas → `CanvasTexture`, same "build a real canvas, not unit-tested
directly" pattern as `earthTexture.ts`). Flags are simplified/recognizable rather than
literal: Portugal's crest becomes a two-tone gold/red emblem circle, Morocco is a red field
with a stroked green pentagram outline (no fill), South Africa's six-color "Y" layout is
kept but flattened to straight-edged shapes.

`src/scene/Markers.tsx` adds a `Flagpole` per destination (thin ink-colored pole + a
10×6-segment plane flag, textured with the country's flag, planted just beside the existing
surfboard pin so neither overlaps). The flag waves via a cheap per-vertex sine written
directly into the plane geometry's own position buffer every frame (no per-frame
allocation); under reduced motion the buffer is simply never touched, so the flag reads as
static cloth. The active destination's flagpole eases up to 1.18× scale (also a hard snap,
not a tween, under reduced motion) in place of a glow ring.

### C. Terrain heights on the globe

`src/scene/terrain.ts` (new) exports `isOnLand(lat,lng)` — the same ray-casting land test
`earthTexture.ts`'s coastline painting is built on, bounding-box-accelerated so a full
sphere vertex pass stays cheap — and `heightAt(lat,lng)`, which layers a deterministic
bilinear value-noise ridge on top (0 on ocean, `0.35×–1×` of `MAX_LAND_HEIGHT = 0.032`
globe-radius units on land; comfortably inside the 0.025–0.035R target).

`src/scene/Globe.tsx` now builds its sphere geometry once (memoized at mount, never
per-frame): bumped to 96×64 segments for a cleaner silhouette, every vertex looked up by its
own lat/lng (`vec3ToLatLng`, the new inverse of `latLngToVec3` in `src/scene/geo.ts`) and
pushed outward by `heightAt`, with a per-vertex color tint (multiplied against the existing
earth texture) darkening toward a mossy green/brown at higher elevations for a cheap "toy
relief" read. Whole-scene triangle budget stays under 50k.

Every element that plants itself on the globe surface — the surfboard pin, the flagpole,
the breaking wave, the landmark, and the bird's own landed/landing/takeoff/celebration pose
and its ground shadow/splash-ring — now samples the same `heightAt` at its own lat/lng and
offsets outward by that amount, so nothing floats above or sinks into the displaced surface.
For the bird specifically, the offset blends in via the existing pose's own z-interpolation
between `FLIGHT_Z` and `LANDED_Z` (`choreography.ts` itself was not touched), so terrain
height ramps in smoothly during a landing descent and back out during takeoff rather than
popping.

---

## Addendum — 2026-07-12: character becomes a toy helicopter (toucan + seaplane rejected)

**Owner decision, 2026-07-12:** the toucan rebuild above (Addendum A) shipped and was
rejected on sight — "ugly," not the cute toy read the brief asked for. An intermediate
seaplane concept was also explored and rejected before landing on the final direction:
**Nalu is now a chunky toy helicopter**, and — a new functional requirement, not just a
re-skin — **the character must point in the direction of flight** (every previous species,
including the toucan, always faced +X/east regardless of `flight.headingDeg`).

`src/scene/Bird.tsx` was rebuilt again to this brief, keeping the filename, the exported
`Bird` component and its exact `{ getInput, animate }` prop contract, the screen-fixed rig
(`position=[0,0.18,1.25]`, `scale=0.09`), and every choreography trigger/timing from
`choreography.ts` (landing/takeoff/celebration) untouched — only the body underneath and its
rotation rig changed:

- **Cabin:** a plump coral (`#FF7E6B`) body with a cream (`#FFFDF7`) belly and a rounded
  bubble nose, ~65% of the visual mass, per the brief.
- **Cockpit face:** an oversized ink (`#14353E`) glass canopy with two white highlight dots —
  the "cuteness lives here" feature, standing in for the toucan's old face.
- **Main + tail rotor:** a sun-yellow (`#FFD166`) hub and two rounded paddle blades, spun via
  `rotation.z` (the camera-facing axis) rather than the aerodynamically "correct" vertical
  axis — from this fixed profile camera a real horizontal rotor disc is edge-on for the same
  reason the old wings needed `WING_TILT`, so spinning in the screen plane instead keeps the
  blades legible as a pinwheel every frame. A faint semi-transparent disc fades in with rotor
  speed for a "blurred at speed" cue.
- **Tail:** a short rounded coral boom, a small fin, and a second, smaller pinwheel rotor.
- **Floats:** two cream pontoons on short ink struts under the cabin; the coral surfboard
  (unchanged asset, unchanged choreography positions) still straps across them.

### Heading yaw

A new `yawRef` group (parent of the existing body) rotates about the *screen-facing* Z axis:
`rotation.z = 90° - flight.headingDeg`, smoothed toward the target via the existing
`shortestAngleDeg` helper at the same `dt·6` rate the rig already uses elsewhere, so a
350°→10° reversal turns the short way instead of spinning through 340°. The formula and its
"north = up-screen, east = right-screen" mapping were derived from, and verified against, the
rig's own `Rx(lat)·Ry(-lng)` composed with `latLngToVec3`'s tangent vectors (both reduce to
the screen's identity mapping at the bird's fixed spot regardless of current lat/lng) — see
`src/scene/Bird.tsx`'s inline derivation comment and `.superpowers/sdd/heli-report.md` for the
full walkthrough and the four-direction screenshot proof.

Banking-roll (existing, dx-driven) now lives *inside* the yaw group, rotating the body's own
local X — its longitudinal/nose-tail axis — instead of the screen-facing Z the old (yaw-less)
bird used, so a bank always tips around whichever way the nose currently points. Pitch is
folded onto that same X axis rather than a separate rotation.z, specifically because two Z
rotations on nested groups sum their angles (same axis, always commutes) — putting pitch on
the body's own rotation.z would have silently added it into the parent's heading yaw.

One subtlety the rebuild had to account for that yaw-less species never surfaced: the
surfboard's *planted* pose (nose-up in the sand beside a landed Nalu) is a fixed, independent
prop, not part of the airframe — nesting it inside the yaw group would make it plant at a
different tilt depending on whatever heading Nalu last flew, instead of always standing
upright. The board now lives in its own wrapper (`boardAttachRef`, sibling of the yaw group)
whose own rotation is blended between "fully attached" (matches the airframe's yaw+bank+pitch,
flying) and "independent" (zero, landed) by the same `groundBlend` fraction the terrain-height
code already computes, so the board doesn't pop between the two and always plants correctly
regardless of heading.

`public/og-image.png` was regenerated from the new intro scene (1280×900, same dimensions as
before). Copy mentioning the toucan (`src/ui/dialogue.ts`, `src/pages/index.astro`,
`README.md`, `src/ui/SideNav.tsx`, `src/ui/FallbackView.tsx`) was updated to helicopter
phrasing; `docs/content-guidelines.md` and `docs/superpowers/**` (historical planning docs)
were left alone, consistent with the toucan addendum's own scoping.

---

**Addendum — 2026-07-13:** owner removed the surfboard. The coral surfboard accessory (flight/planted/held-overhead poses, the `Board` mesh, and all of its choreography in `src/scene/Bird.tsx` + `src/scene/choreography.ts`) is gone entirely; landing now settles straight onto the surface (splash rings unchanged), takeoff ascends with no board tuck, and the confirmation celebration keeps its double-hop but drops the board-overhead raise.

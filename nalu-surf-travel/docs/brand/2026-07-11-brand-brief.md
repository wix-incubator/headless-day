# Birdie Surf Travel — Brand Brief

**For:** game visual designer (3D + UI redesign) · **Date:** 2026-07-11
**Fixed:** name (Birdie Surf Travel), mascot (Nalu the nene), medium (three.js primitives, flat/toon shading, gradients + vertex colors only, whole globe always in frame).

## 1. Positioning & promise

- **Positioning:** The one-surfer travel agency that plans around the wave — wind, tide, season — not the resort; and the only one you can *play* before you book.
- **Promise:** Tell us the wave you dream about; we handle everything between you and the takeoff.

## 2. Brand personality

- **Warm** — aloha hospitality; the site greets you by name (Nalu's), never with a form. Soft shapes, cream cards, golden light.
- **Expert-casual** — real surf knowledge worn lightly. The info cards already prove it ("NE trade winds groom the faces"); visuals must match that specificity, never undercut it.
- **Handcrafted** — a one-person business; the world should feel hand-carved like a wooden toy diorama, with deliberate asymmetry — never like an asset pack.
- **Optimistic** — perpetual dawn patrol: the light says "the waves are good and you're going."
- **Nimble** — small agency, quick answers; UI motion is quick and springy, never sluggish or ceremonial.

**Playful vs childish — the line:** the *world* is a toy; the *information* is real. Nalu jokes about flying, never about facts, prices, or bookings. No baby-talk, no random cuteness, no rainbow confetti. If a kid's app could ship the element unchanged, it's over the line.

## 3. What "surf" must mean visually (priority order)

The current world contains zero surf signifiers. Add these:

1. **Swell lines** — concentric arcs of lighter water wrapping toward every coast (corduroy seen from the air). THE aerial surf image; makes the empty ocean read as a living one. Slow drift animation.
2. **Breaking waves at destinations** — a small peeling wave (white foam crescent sliding along a lighter water band) at each surf pin. This is the product itself, visible from the sky.
3. **Surfboard pins** — replace lollipop markers with surfboards planted nose-up in the sand, a different board color per destination. Instantly says "surf trip," not "map point."
4. **Reef/shallow gradient** — turquoise shallows rimming every coastline, fading to deep ocean. Fixes the flat single-teal sphere and reads tropical at a glance.
5. **Foam trim** — a thin cream line where land meets sea. Defines the currently amorphous continent silhouettes for free.
6. **Golden-hour light** — low warm sun, warm rim-light on the globe's lit side, long soft shadows. Dawn-patrol mood; also fixes the flat lighting.
7. **Nalu's surfboard** — see §4.
8. **Destination landmarks** — one ≤3-primitive prop per destination (Diamond Head cone, Uluwatu temple gate, Ericeira chapel, Taghazout arch, Nosara jungle tree, J-Bay point with peeling wall). Makes each landing distinct and screenshot-worthy.

## 4. Nalu's character

**Honest read of the current model:** a gray-brown ellipsoid lying flush on the sphere. No neck, no tail, no visible wings in flight, no altitude — it reads as a pebble or a turtle resting on the globe, not a bird flying over it. The real nene's most recognizable features (buff cheek, striped neck) are absent, so the goose-gray reads as "unfinished," not "nene."

- **Silhouette:** head clearly separated by a neck; short upswept tail; wings OUT as two tapered planes during flight with a flap loop. Nalu flies at visible altitude with a soft blob shadow projected on the globe below — the shadow alone kills the "lying on the ball" problem.
- **Nene markings (vertex colors, cheap):** black head + hindneck (reuse ink `#14353E`), buff cheek patch `#F5E2B8`, 2–3 cream diagonal chevrons on the dark neck (the nene's signature furrows), warm taupe body `#9C8B72`, cream chest. Suddenly it's a *specific* bird — guideline 3.
- **Personality through motion:** banks hard into turns, does a happy pre-landing wiggle when in range, head tilts toward a nearby pin, celebration hop on booking confirmation. Eagerness = the agency's nimbleness.
- **The one iconic accessory: a tiny surfboard.** Tucked under Nalu during flight; planted in the sand beside Nalu when landed; raised overhead in the confirmation hop. One prop, three story beats, and every screenshot says "surf."

## 5. Color direction (evolve, don't replace)

Day mood: **golden-hour dawn patrol** — warm sky, cool water, cream UI.

| Token | Current | New | What the shift buys |
|---|---|---|---|
| Sky (bg gradient) | flat `#8FE3DB` | `#FFE3C2` (horizon) → `#9ADBE8` (top) | Warm-vs-cool figure/ground: globe stops melting into the sky; instant golden-hour mood |
| Ocean deep | `#2FA8BC` | `#157A96` | Depth + contrast so swell lines and shallows are legible |
| Ocean shallow/reef | — (new) | `#58D3C7` | Tropical lagoon ring around every coast |
| Foam/whitewater | — (new) | `#FFFDF7` (reuse `--card`) | Coastline definition; wave crests; ties 3D world to UI cream |
| Land green | `#8ED081` / `#5FB56E` | keep, warm slightly to `#8FD07E` primary | Continuity; two-green variety stays |
| Sand | `#F2D8A7` | keep | Works |
| Coral accent (CTA) | `#FF7E6B` / `#E85F4C` | keep | CTA equity; also board + landmark accent |
| Sun yellow | `#FFD166` | keep | Active/selected states; the sun disc itself |
| Ink | `#14353E` | keep | Outlines, text, Nalu's head |
| Clouds | gray `#FFFFFF`/gray discs | pure `#FFFDF7`, fewer, puffier, higher | Currently they read as extra continents; lift + whiten so they read as clouds |

Rule: warm hues = land/light/action, cool hues = water/depth. UI keeps cream cards + ink outlines (they already work).

## 6. Typography & voice

**Fredoka stays.** Rounded geometric matches the toy 3D forms, holds up at small info-card sizes, already shipped and loading — the problem was never the font, it's discipline. Enforce hierarchy: 600 headings / 500 buttons-labels / 400 body; uppercase letter-spaced eyebrows (as now); no second typeface.

**Voice — keep the current register, sharpen with rules:**
1. Lead with the fact, land with the charm — never the reverse.
2. Surf vocabulary used correctly (break, offshore, mid tide) and never condescendingly explained.
3. Nalu: first person, present tense, max 2 sentences per bubble.
4. Hawaiian sparingly: *aloha* and *nalu* only — no fake pidgin, no "hang loose."
5. One "!" per bubble max; errors stay in character ("Choppy connection") but always state what to do next.
6. Per content guidelines: no periods in titles; CTAs start with action verbs ("Plan this trip with the agent").

## 7. Signature moment — THE screenshot

**The landing.** Press Land → Nalu banks down and settles on the sand *next to its planted surfboard*, the destination's landmark behind it, a wave peeling just offshore, golden rim-light, destination name in the docked card. Six destinations = six distinct collectible postcards; this one frame carries the OG image, the competition first impression, and social shares.

Designer effort allocation: spend on this beat first (touchdown animation + per-destination landmark + peeling wave), swell lines second, Nalu's flight silhouette third. Everything else is polish.

## 8. Anti-goals — never look like

- **A kids' app** — no googly eyes, no rainbow palette, no bouncing for no reason. Playful world, adult competence.
- **Asset-pack low-poly Earth** — no generic blue-marble icosphere with random cones for trees; every prop placed for a reason (guideline 6: no vibe-coded genericness).
- **A corporate travel brochure** — no stock-sunset energy, no "Explore the World ✈️" clichés, no gradient-mesh SaaS hero.
- **Surf-bro kitsch** — no "gnarly/shred/stoked," no flame decals, no hibiscus wallpaper; one hibiscus emoji in a card title is the ceiling.
- **A simulator** — no realistic water shaders, PBR, or photoreal lighting; the moment it tries to look real, the toy charm dies.
- **Emoji doing the branding** — emoji may garnish copy chips; they never substitute for a designed 3D or UI element.

**Rename 2026-07-14:** Birdie Surf Travel → Nalu Surf Travel (agency named after the helicopter pilot Nalu; 'Birdie' clashed with the non-bird mascot).

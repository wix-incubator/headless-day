# Birdie Breaks — Design Spec

**Rename (2026-07-11):** brand renamed to Birdie Surf Travel (user decision, clarity); bird remains Nalu.

**Date:** 2026-07-09
**Status:** Approved design, pending implementation plan
**Note:** This repo predates the Wix scaffold. The scaffold (`npm create @wix/new@latest headless`) targets a fresh folder — the implementation plan's first step must scaffold into a temp folder and merge it into this repo (preserving git history), or verify the CLI accepts an existing directory.

## 1. Overview

**Birdie Breaks** is a booking site for a surf-travel agent, built on **Wix Headless**. The main interface is a playful three.js globe: the visitor flies a little bird — **Nalu the nene** (Hawaii's state bird, named after the Hawaiian word for "wave") — over a low-poly toy Earth using the arrow keys. Nalu is also the guide character: it introduces itself and the site at the start, narrates via speech bubbles, and opens the booking calendar. Landing at surf destinations reveals travel info and a call-to-action to book a real appointment with the agent via **Wix Bookings**.

Look and feel: toy video game, Hawaii style, simple 3D geometry, whole globe always visible in the window.

### Goals / success criteria

- A visitor with no instructions can: watch the intro → fly → land at a destination → read its info → book a real appointment, entirely with the keyboard.
- The agent sees each booking as a normal appointment in their Wix dashboard (no custom back office).
- The site is live on Wix hosting from day one (scaffold deploys immediately).
- Booking works even when 3D doesn't (WebGL fallback keeps the business function).

### Decisions log

| Decision | Choice |
|---|---|
| Booking backend | Real Wix Bookings (availability + booking creation via headless SDK) |
| Destination content | Hardcoded data module in the app (~6 destinations) |
| Guide character | The bird **is** the character (no separate NPC); speech bubbles |
| Reaching a destination | Prompt to land ("Press Space to land at …"), not auto-popup |
| Devices | Desktop-first; basic touch controls on mobile (virtual d-pad + Land button); no pixel-perfect mobile polish in v1 |
| Side nav contents | Destinations quick-jump, About the agency, My booking / contact (controls are taught in the intro; no separate help page) |
| Brand / character names | Site: **Birdie Breaks** · Bird: **Nalu** (a nene) |
| 3D approach | React Three Fiber inside the Wix Headless React scaffold (approach A; vanilla three.js and game engines rejected) |
| Booking UI | Custom game-styled calendar on headless Bookings APIs — not the embedded Wix widget |

## 2. Architecture

**Stack:** Wix Headless scaffold (`npm create @wix/new@latest headless`, blank template → React app deployed on Wix) + `@react-three/fiber` + `@react-three/drei` + `zustand`. Single page: full-window R3F canvas, all UI as React DOM overlaid on it. One connected business solution: **Bookings**.

**Game state machine** (single zustand store drives both the 3D scene and the DOM UI):

```
intro → flying ⇄ approaching → landed → booking → confirmed
                                  ↑__________________________|  (take off)
```

**Experience flow:**

1. **Intro** — globe settles into view, Nalu glides in. Speech-bubble sequence: self-introduction, what the site is (surf-travel agency), controls (arrow keys fly, Space lands). "Let's fly!" hands over control.
2. **Flying** — arrow keys steer Nalu at fixed altitude; the globe rotates under the bird so the **whole globe stays in frame** (camera does not chase). Destination markers protrude from the surface.
3. **Approaching** — within landing range of a marker: hint toast — "Press Space to land at Oahu"; marker glows/bounces.
4. **Landed** — touchdown animation; info card slides in (see §4 data shape) with CTA **"Plan this trip with the agent."** Space/Esc takes off.
5. **Booking** — Nalu opens the calendar ("Let's find a time!"). Calendar fetches real availability, user picks a slot, enters name + email, booking is created.
6. **Confirmed** — Nalu celebrates (happy hop); confirmation summary; booking stored in `localStorage` for the side nav's "My booking".

**Side nav** — edge tab that unfolds: Destinations (click → Nalu flies there), About Birdie Breaks, My booking / contact. The booking entry shows the locally-saved booking when one exists; otherwise it opens the booking calendar directly, skipping the globe flow. Agency contact info appears in both cases.

## 3. Components

### 3D scene (R3F)

| Component | Responsibility |
|---|---|
| `Globe` | Low-poly sphere: gradient ocean, stylized extruded continents, tiny palm trees, puffy low-poly clouds slowly orbiting |
| `Nalu` | Bird built from primitives (body/wings/beak — no modeling software). Animations: wing-flap loop, banking on turns, landing/takeoff hop, celebration hop on confirmation |
| `DestinationMarkers` | Chunky pins with pulsing ring; glow + bounce when in landing range |
| Scene dressing | Sun, sky-gradient background, soft shadows |

### UI overlay (DOM)

| Component | Responsibility |
|---|---|
| `SpeechBubble` | Nalu's dialogue: typewriter text anchored near the bird, advances on click/keypress |
| `InfoCard` | Destination panel: best travel window (wind + tide notes), top surf spots, skill level, water temp, booking CTA |
| `BookingCalendar` | Game-styled: month grid → real open slots → name + email → confirm |
| `SideNav` | Edge tab: destinations quick-jump, about, my booking / contact |
| `HintToast` | Contextual prompts ("Press Space to land…") |
| `TouchControls` | Virtual d-pad + Land button, shown on touch devices only |
| `gameStore` (zustand) | State machine, bird position/heading, active destination, booking state |

### Approved UI layout (from the interactive mock)

Mock: `2026-07-09-birdie-breaks-ui-mock.html` (also at https://claude.ai/code/artifact/b17ed9c2-05d8-4b75-98f9-c16c474ba26e). Approved placements:

- **Info card docks right** (~31% width) — never covers the globe or the bird; take-off hint at its foot.
- **Booking calendar is a center modal** (~60% width): calendar grid left, slot chips + name/email right; Nalu remains visible behind it.
- **Side-nav tab on the left edge in every state**; opens as a left drawer (~28%) over a scrim.
- **Hint toast & controls chip sit bottom-center**; the controls chip fades after a few seconds of flying.
- **Speech bubble anchors to the bird** with a tail pointing at it.
- **Mobile:** virtual d-pad bottom-left, coral Land button bottom-right (active only in landing range); info card and calendar become bottom sheets.

### Visual direction

Saturated pastel palette (lagoon teal, coral, sunshine yellow, sand); flat/toon shading (`MeshToonMaterial` or flat lambert); rounded chunky UI cards with thick outlines and bouncy pop-in animations; friendly display font (Fredoka or Baloo). Everything slightly oversized and squishy — toy diorama, not simulator.

## 4. Destinations data

Hardcoded module, one record per destination:

```ts
{ id, name, country, emoji, lat, lng,
  bestWindow: { months, windNotes, tideNotes },
  spots: [{ name, note }],        // 2–3 per destination
  skillLevel, waterTemp }
```

Initial six: **Oahu — North Shore, Hawaii** (Nov–Feb; Pipeline, Sunset, Waimea) · **Bali — Uluwatu, Indonesia** (Apr–Oct dry season; Uluwatu, Padang Padang) · **Ericeira, Portugal** (Sep–Nov; Ribeira d'Ilhas, Coxos) · **Taghazout, Morocco** (Oct–Mar; Anchor Point) · **Nosara, Costa Rica** (Dec–Apr offshore mornings; Playa Guiones) · **Jeffreys Bay, South Africa** (Jun–Aug; Supertubes).

## 5. Wix Bookings data flow

**One-time dashboard setup (prerequisite):** a single Bookings service — **"Trip-planning session with your surf agent"** (30 min, online) — with the agent's working hours; those hours feed availability.

**Runtime:**

```
App start ──► wixClient (anonymous visitor OAuth tokens from scaffold config)
Booking opens ──► fetch service (once, cached)
              ──► queryAvailability(service, next ~30 days, visitor timezone)
              ──► calendar renders open slots
Pick slot + name/email ──► createBooking(slot, contactDetails)
Success ──► confirmed state; saved to localStorage for "My booking"
```

No member accounts in v1: "My booking" shows only the locally-saved booking from this browser + agency contact info. The agent sees all bookings in the Wix dashboard regardless.

## 6. Error handling

All failures speak through Nalu, in character:

- **No WebGL / old device** → skip the globe; render plain destination list + the same DOM booking calendar. Business function never depends on 3D.
- **Availability/API errors** → Nalu apologizes ("Choppy connection!") + retry button; a window with zero slots → "no open waves this month" + contact info.
- **Slot conflict on create** (taken mid-booking) → re-query availability; Nalu: "someone just caught that one — pick another!"

### Accessibility & performance

- `prefers-reduced-motion` tones down scene + UI animation.
- Dialogue, info card, calendar, and side nav fully keyboard-navigable (game is keyboard-driven by design).
- Pixel-ratio cap; pause render loop when tab hidden; low poly counts throughout.

## 7. Testing

Test the logic, eyeball the art:

- **Unit:** state-machine transitions; bird orbit/steering math; marker proximity detection; availability-response → calendar-model mapping; destinations data-shape validation.
- **Component (RTL):** InfoCard renders a destination; calendar renders slots and handles empty; speech-bubble sequence advances; side-nav quick-jump dispatches fly-to.
- **Integration:** booking flow with the Wix SDK client mocked at its factory seam — happy path, API failure, slot conflict.
- **Manual verification:** real app against the real test service — fly, land, book, confirm the appointment appears in the Wix dashboard.

## 8. Out of scope (v1)

Member accounts/login · Wix CMS-managed content · full mobile polish · multiple booking services or staff members · payments · i18n · sound effects/music.

# Birdie Breaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Birdie Breaks — a Wix Headless booking site where visitors fly Nalu the nene over a low-poly three.js globe, land at surf destinations, and book real appointments with the agent via Wix Bookings.

**Architecture:** React Three Fiber scene (globe rotates under a screen-fixed bird) + DOM overlay UI, driven by one zustand store holding a six-state game machine (`intro → flying ⇄ approaching → landed → booking → confirmed`). Wix Bookings is the only backend integration; destinations are a hardcoded data module.

**Tech Stack:** Wix Headless scaffold (**Astro 5 SSR** — verified in Task 1; the entire game mounts as ONE React island via `client:only="react"`, so every React component/test below is unchanged), `@react-three/fiber`, `@react-three/drei`, `zustand`, `@wix/sdk` + `@wix/bookings`, Vitest + React Testing Library, `@fontsource/fredoka`.

**Spec:** `docs/superpowers/specs/2026-07-09-birdie-breaks-design.md` (approved). UI layout mock: `docs/superpowers/specs/2026-07-09-birdie-breaks-ui-mock.html` (approved).

## Global Constraints

- **Node:** ≥ v20.11.0 — this machine uses fnm with default v16. **Every shell must start with** `eval "$(fnm env)" && fnm use 20`. The Wix CLI is installed under fnm Node 20 only.
- **npm registry:** `https://npm.dev.wixpress.com/` (already configured; do not change).
- **One Wix integration:** Bookings only. No CMS, no members/login, no payments, no i18n, no sound.
- **Names verbatim:** site **"Birdie Breaks"**, bird **"Nalu"**, Bookings service **"Trip-planning session with your surf agent"** (30 min, online). **Rename (2026-07-11):** brand renamed to Birdie Surf Travel (user decision, clarity); bird remains Nalu.
- **Repo:** `/Users/giladi/Documents/repos/birdie-breaks`, branch `main`. All paths below are repo-relative.
- **Commits:** each task ends in a commit; these are pre-approved by the user's sign-off on this plan. Never push (no remote yet).
- **Palette tokens (from approved mock):** lagoon `#2FA8BC`, sky `#8FE3DB`, coral `#FF7E6B`, coral-deep `#E85F4C`, sun `#FFD166`, sand `#F2D8A7`, leaf `#8ED081`, ink `#14353E`, card `#FFFDF7`. Font: Fredoka (bundled via `@fontsource/fredoka`); rounded chunky UI: 3px ink borders, 18px radii, hard offset shadows.
- **All user-facing error copy speaks as Nalu, in character** (exact strings given in tasks).
- **Accessibility/perf:** respect `prefers-reduced-motion`; Canvas `dpr={[1, 2]}`; skip ticking when `document.hidden`; all UI keyboard-operable.
- **Approved layout (do not re-decide):** info card docks right; booking is a center modal; side-nav tab left edge in every state → left drawer over scrim; hint toast & controls chip bottom-center; speech bubble anchors to the bird; mobile gets d-pad bottom-left + Land button bottom-right, cards become bottom sheets.

## File Structure

```
src/
  data/destinations.ts        # 6 destination records + types (pure data)
  data/agency.ts              # agency contact + about copy
  game/flight.ts              # pure flight math: step, wrap/clamp, distance, proximity
  game/machine.ts             # pure state machine: GameStateName, GameEvent, transition()
  game/store.ts               # zustand store: state + flight + send/tick/flyTo
  scene/geo.ts                # latLngToVec3 + angle helpers (pure)
  scene/GlobeScene.tsx        # R3F Canvas root: camera, lights, sky, rig
  scene/Globe.tsx             # low-poly globe + continents + clouds
  scene/Markers.tsx           # destination pins (+ active highlight)
  scene/Bird.tsx              # Nalu from primitives + bob/bank animation
  scene/webgl.ts              # isWebGLAvailable()
  hooks/useKeyboardControls.ts# arrows→input ref, Space/Esc→machine events
  hooks/useReducedMotion.ts   # prefers-reduced-motion hook
  ui/dialogue.ts              # Nalu's intro lines + copy constants
  ui/SpeechBubble.tsx         # typewriter bubble, advances on click/key
  ui/HintToast.tsx            # "Press Space to land at …"
  ui/InfoCard.tsx             # destination panel + booking CTA
  ui/BookingCalendar.tsx      # month grid + slots + form + confirm
  ui/ConfirmedCard.tsx        # booking summary + back to the skies
  ui/SideNav.tsx              # edge tab → drawer (destinations/about/my booking)
  ui/TouchControls.tsx        # virtual d-pad + LAND button
  ui/FallbackView.tsx         # no-WebGL: destination list + calendar
  bookings/client.ts          # Wix SDK client factory (THE mock seam)
  bookings/api.ts             # getService/getAvailability/createBooking + typed errors
  bookings/mapping.ts         # availability response → calendar model (pure)
  bookings/myBooking.ts       # localStorage save/load (pure-ish)
  styles/game.css             # palette tokens + all overlay styles
  App.tsx                     # composition + state-driven overlay switch
src/test/setup.ts             # jest-dom setup
docs/scaffold-notes.md        # Task 1 output: framework, commands, client-id source
```

Dependency direction: `ui/*` and `scene/*` depend on `game/*` and `data/*`; `game/*` depends on nothing but itself; `bookings/api.ts` depends on `bookings/client.ts` (tests mock **client.ts**, the direct factory seam).

---

### Task 1: Scaffold the Wix Headless project into the existing repo, deploy, record facts

The repo already exists with docs; the scaffolder wants a fresh folder. Scaffold to a sibling temp folder and merge.

**Files:**
- Create: entire scaffold tree (framework-owned), `docs/scaffold-notes.md`
- Modify: `README.md` (add dev commands), `.gitignore` (from scaffold)

**Interfaces:**
- Produces: a running `npm run dev` app; `docs/scaffold-notes.md` with the exact fields later tasks read: `FRAMEWORK`, `DEV_CMD`, `BUILD_CMD`, `DEPLOY_CMD`, `CLIENT_ID_SOURCE` (file + key where the OAuth client id lives), `ENTRY_COMPONENT` (the file where our `<App/>` mounts).

- [ ] **Step 1: Commit the pending docs changes** (spec layout addendum + mock file are uncommitted)

```bash
cd /Users/giladi/Documents/repos/birdie-breaks
git add -A && git commit -m "docs: add approved UI layout addendum and interactive mock"
```

- [ ] **Step 2: Fetch and follow the canonical build skill for scaffolding**

Read <https://www.wix-headless.dev/skill.md> (raw). Follow its Phase-1 bootstrap **but scaffold to a temp folder**:

```bash
eval "$(fnm env)" && fnm use 20
cd /Users/giladi/Documents/repos
npm create @wix/new@latest headless -- \
  --business-name "Birdie Breaks" \
  --folder-name "birdie-breaks-scaffold" \
  --site-template "blank" \
  --no-publish
```

If the flags differ from the current skill.md, follow skill.md — same answers: business name `Birdie Breaks`, blank template, no publish.

- [ ] **Step 3: Merge scaffold into the repo and clean up**

```bash
rsync -a --exclude .git birdie-breaks-scaffold/ birdie-breaks/
rm -rf birdie-breaks-scaffold
cd birdie-breaks && npm install
```

- [ ] **Step 4: Verify the app runs**

Run: `npm run dev` — expect a local URL serving the scaffold page; open it, confirm it renders, Ctrl-C.
**Resolved (execution):** the scaffold is Astro 5 SSR with `@astrojs/react` available. Approach A holds — the game is a single React island: `src/pages/index.astro` renders `<App client:only="react" />`. Ensure `react()` is in `astro.config.mjs` integrations.

- [ ] **Step 5: Write `docs/scaffold-notes.md`** with actually-observed values, exactly this shape:

```markdown
# Scaffold notes (Task 1 — facts later tasks depend on)
- FRAMEWORK: <e.g. React 18 + Vite + TypeScript>
- DEV_CMD: <e.g. npm run dev>
- BUILD_CMD: <e.g. npm run build>
- DEPLOY_CMD: <exact command the scaffold README gives for deploy/release>
- CLIENT_ID_SOURCE: <file + key, e.g. wix.config.json → "clientId", or src/…>
- ENTRY_COMPONENT: <file that renders the root component we will replace with App.tsx>
- LIVE_URL: <URL of the deployed site, if bootstrap deployed one>
```

- [ ] **Step 6: Deploy once** (per skill.md / scaffold README, record URL in scaffold-notes), then commit:

```bash
git add -A && git commit -m "chore: scaffold Wix Headless app (Birdie Breaks) and record scaffold notes"
```

---

### Task 2: Test tooling (Vitest + RTL)

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/test/smoke.test.tsx`
- Modify: `package.json` (add `test` script + devDeps)

**Interfaces:**
- Produces: `npm test` (one-shot) runs Vitest with jsdom + jest-dom. All later tasks run `npm test`.

- [ ] **Step 1: Install dev dependencies**

```bash
eval "$(fnm env)" && fnm use 20 && cd /Users/giladi/Documents/repos/birdie-breaks
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

The scaffold is Astro, so there is no standalone vite.config — give Vitest its own React transform: `npm i -D @vitejs/plugin-react` and set `plugins: [react()]` in `vitest.config.ts` (tests exercise only the React island, never .astro files).

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Create failing smoke test `src/test/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';

test('smoke: renders JSX under jsdom', () => {
  render(<h1>Birdie Breaks</h1>);
  expect(screen.getByRole('heading', { name: 'Birdie Breaks' })).toBeInTheDocument();
});
```

- [ ] **Step 5: Add script and run**

In `package.json`: `"test": "vitest run"`. Run: `npm test` → expect `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "test: add vitest + testing-library toolchain with smoke test"
```

---

### Task 3: Destinations data module

**Files:**
- Create: `src/data/destinations.ts`, `src/data/agency.ts`
- Test: `src/data/destinations.test.ts`

**Interfaces:**
- Produces: `interface Destination { id: string; name: string; country: string; emoji: string; lat: number; lng: number; bestWindow: { months: string; windNotes: string; tideNotes: string }; spots: { name: string; note: string }[]; skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels'; waterTemp: string }`, `const DESTINATIONS: Destination[]` (6 records), `const LANDING_RANGE_DEG = 14`. From `agency.ts`: `const AGENCY = { about: string; email: string; phone: string }`.

- [ ] **Step 1: Write failing test `src/data/destinations.test.ts`**

```ts
import { DESTINATIONS, LANDING_RANGE_DEG } from './destinations';

test('has exactly six destinations with unique ids', () => {
  expect(DESTINATIONS).toHaveLength(6);
  expect(new Set(DESTINATIONS.map(d => d.id)).size).toBe(6);
});

test('coordinates are valid and spots are 2-3 per destination', () => {
  for (const d of DESTINATIONS) {
    expect(d.lat).toBeGreaterThanOrEqual(-90);
    expect(d.lat).toBeLessThanOrEqual(90);
    expect(d.lng).toBeGreaterThan(-180);
    expect(d.lng).toBeLessThanOrEqual(180);
    expect(d.spots.length).toBeGreaterThanOrEqual(2);
    expect(d.spots.length).toBeLessThanOrEqual(3);
  }
});

test('landing range is a sane angular distance', () => {
  expect(LANDING_RANGE_DEG).toBeGreaterThan(5);
  expect(LANDING_RANGE_DEG).toBeLessThan(30);
});
```

- [ ] **Step 2: Run `npm test` → FAIL** (module not found).

- [ ] **Step 3: Create `src/data/destinations.ts`**

```ts
export interface SurfSpot { name: string; note: string }

export interface Destination {
  id: string; name: string; country: string; emoji: string;
  lat: number; lng: number;
  bestWindow: { months: string; windNotes: string; tideNotes: string };
  spots: SurfSpot[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
  waterTemp: string;
}

/** Angular distance (deg) within which the bird may land at a marker. */
export const LANDING_RANGE_DEG = 14;

export const DESTINATIONS: Destination[] = [
  { id: 'oahu', name: 'Oahu — North Shore', country: 'Hawaii, USA', emoji: '🌺',
    lat: 21.6, lng: -158.1,
    bestWindow: { months: 'Nov – Feb', windNotes: 'NE trade winds groom the faces', tideNotes: 'Best around mid tide' },
    spots: [
      { name: 'Pipeline', note: "the world's barrel" },
      { name: 'Sunset Beach', note: 'big open walls' },
      { name: 'Waimea Bay', note: 'the big-wave classic' }],
    skillLevel: 'Advanced', waterTemp: '25°C' },
  { id: 'bali', name: 'Bali — Uluwatu', country: 'Indonesia', emoji: '🌴',
    lat: -8.8, lng: 115.1,
    bestWindow: { months: 'Apr – Oct', windNotes: 'SE trades blow offshore all dry season', tideNotes: 'Mid-to-high — the reef is sharp below' },
    spots: [
      { name: 'Uluwatu', note: 'long walls under the temple' },
      { name: 'Padang Padang', note: 'the Balinese Pipeline' }],
    skillLevel: 'Advanced', waterTemp: '28°C' },
  { id: 'ericeira', name: 'Ericeira', country: 'Portugal', emoji: '🐚',
    lat: 38.99, lng: -9.42,
    bestWindow: { months: 'Sep – Nov', windNotes: 'E winds are offshore in the mornings', tideNotes: 'Coxos turns on at mid tide' },
    spots: [
      { name: "Ribeira d'Ilhas", note: 'rippable rights all day' },
      { name: 'Coxos', note: 'world-class point when it lines up' }],
    skillLevel: 'Intermediate', waterTemp: '18°C' },
  { id: 'taghazout', name: 'Taghazout', country: 'Morocco', emoji: '🐪',
    lat: 30.54, lng: -9.71,
    bestWindow: { months: 'Oct – Mar', windNotes: 'NE mornings hold the points offshore', tideNotes: 'Points line up low-to-mid' },
    spots: [
      { name: 'Anchor Point', note: 'the endless right' },
      { name: 'Killer Point', note: 'bigger, longer, emptier' }],
    skillLevel: 'Intermediate', waterTemp: '19°C' },
  { id: 'nosara', name: 'Nosara', country: 'Costa Rica', emoji: '🦥',
    lat: 9.98, lng: -85.65,
    bestWindow: { months: 'Dec – Apr', windNotes: 'Offshore every dry-season morning', tideNotes: 'Guiones works on all tides' },
    spots: [
      { name: 'Playa Guiones', note: 'friendly beach-break machine' },
      { name: 'Ostional', note: 'punchier peaks up the coast' }],
    skillLevel: 'All levels', waterTemp: '28°C' },
  { id: 'jbay', name: 'Jeffreys Bay', country: 'South Africa', emoji: '🐋',
    lat: -34.05, lng: 24.93,
    bestWindow: { months: 'Jun – Aug', windNotes: 'W winds offshore with winter swells', tideNotes: 'Lower tide makes it race' },
    spots: [
      { name: 'Supertubes', note: 'the fastest wall on earth' },
      { name: 'Boneyards', note: 'the take-off above Supers' }],
    skillLevel: 'Advanced', waterTemp: '17°C' },
];

export function destinationById(id: string): Destination | undefined {
  return DESTINATIONS.find(d => d.id === id);
}
```

- [ ] **Step 4: Create `src/data/agency.ts`**

```ts
export const AGENCY = {
  about:
    'Birdie Breaks is a one-surfer travel agency. Tell us the wave you dream about; ' +
    'we plan the flights, the boards, the beds, and the backup spot for when the wind turns.',
  email: 'aloha@birdiebreaks.com',
  phone: '+1 (808) 555-0134',
};
```

- [ ] **Step 5: Run `npm test` → PASS. Commit**

```bash
git add src/data && git commit -m "feat: destinations data module and agency copy"
```

---

### Task 4: Flight math (pure)

**Files:**
- Create: `src/game/flight.ts`
- Test: `src/game/flight.test.ts`

**Interfaces:**
- Produces: `interface FlightState { lat: number; lng: number; headingDeg: number }`, `interface FlightInput { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }`, `stepFlight(s, input, dtSec, speedDegPerSec = 30): FlightState`, `angularDistanceDeg(aLat, aLng, bLat, bLng): number`, `nearestDestination(s: FlightState, dests: Destination[], rangeDeg: number): { dest: Destination; distanceDeg: number } | null`, `shortestAngleDeg(fromDeg, toDeg): number`.

- [ ] **Step 1: Write failing test `src/game/flight.test.ts`**

```ts
import { stepFlight, angularDistanceDeg, nearestDestination, shortestAngleDeg } from './flight';
import { DESTINATIONS } from '../data/destinations';

const at = (lat: number, lng: number) => ({ lat, lng, headingDeg: 0 });

test('ArrowUp moves north at 30 deg/sec', () => {
  expect(stepFlight(at(0, 0), { dx: 0, dy: 1 }, 1).lat).toBeCloseTo(30);
});

test('longitude wraps across the antimeridian', () => {
  expect(stepFlight(at(0, 179), { dx: 1, dy: 0 }, 1).lng).toBeCloseTo(-151);
});

test('latitude clamps at ±80', () => {
  expect(stepFlight(at(79, 0), { dx: 0, dy: 1 }, 1).lat).toBe(80);
  expect(stepFlight(at(-79, 0), { dx: 0, dy: -1 }, 1).lat).toBe(-80);
});

test('heading follows movement direction, kept when idle', () => {
  expect(stepFlight(at(0, 0), { dx: 1, dy: 0 }, 0.1).headingDeg).toBeCloseTo(90);
  expect(stepFlight({ lat: 0, lng: 0, headingDeg: 42 }, { dx: 0, dy: 0 }, 0.1).headingDeg).toBe(42);
});

test('angular distance: quarter turn along the equator is 90°', () => {
  expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(90);
  expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(angularDistanceDeg(0, 90, 0, 0));
});

test('nearestDestination finds Oahu in range, null far away', () => {
  const nearOahu = at(20, -160);
  expect(nearestDestination(nearOahu, DESTINATIONS, 14)?.dest.id).toBe('oahu');
  expect(nearestDestination(at(0, 40), DESTINATIONS, 14)).toBeNull();
});

test('shortestAngleDeg goes the short way around', () => {
  expect(shortestAngleDeg(350, 10)).toBeCloseTo(20);
  expect(shortestAngleDeg(10, 350)).toBeCloseTo(-20);
});
```

- [ ] **Step 2: Run `npm test` → FAIL** (module not found).

- [ ] **Step 3: Implement `src/game/flight.ts`**

```ts
import type { Destination } from '../data/destinations';

export interface FlightState { lat: number; lng: number; headingDeg: number }
export interface FlightInput { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

const MAX_LAT = 80;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function wrapLng(lng: number): number {
  let x = ((lng + 180) % 360 + 360) % 360 - 180;
  return x === -180 ? 180 : x;
}

export function stepFlight(
  s: FlightState, input: FlightInput, dtSec: number, speedDegPerSec = 30,
): FlightState {
  const step = speedDegPerSec * dtSec;
  const lat = Math.min(MAX_LAT, Math.max(-MAX_LAT, s.lat + input.dy * step));
  const lng = wrapLng(s.lng + input.dx * step);
  const moving = input.dx !== 0 || input.dy !== 0;
  const headingDeg = moving ? deg(Math.atan2(input.dx, input.dy)) : s.headingDeg;
  return { lat, lng, headingDeg };
}

/** Central angle between two points on the sphere, in degrees. */
export function angularDistanceDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const cosc =
    Math.sin(rad(aLat)) * Math.sin(rad(bLat)) +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLng - aLng));
  return deg(Math.acos(Math.min(1, Math.max(-1, cosc))));
}

export function nearestDestination(
  s: FlightState, dests: Destination[], rangeDeg: number,
): { dest: Destination; distanceDeg: number } | null {
  let best: { dest: Destination; distanceDeg: number } | null = null;
  for (const dest of dests) {
    const distanceDeg = angularDistanceDeg(s.lat, s.lng, dest.lat, dest.lng);
    if (distanceDeg <= rangeDeg && (!best || distanceDeg < best.distanceDeg)) {
      best = { dest, distanceDeg };
    }
  }
  return best;
}

/** Signed shortest rotation from one angle to another, in (-180, 180]. */
export function shortestAngleDeg(fromDeg: number, toDeg: number): number {
  return wrapLng(toDeg - fromDeg);
}
```

- [ ] **Step 4: Run `npm test` → PASS. Commit**

```bash
git add src/game && git commit -m "feat: pure flight math (steering, wrapping, proximity)"
```

---

### Task 5: Game state machine + zustand store

**Files:**
- Create: `src/game/machine.ts`, `src/game/store.ts`
- Test: `src/game/machine.test.ts`, `src/game/store.test.ts`

**Interfaces:**
- Consumes: `stepFlight`, `nearestDestination`, `FlightState`, `FlightInput` (Task 4); `DESTINATIONS`, `LANDING_RANGE_DEG`, `destinationById` (Task 3).
- Produces:
  - `type GameStateName = 'intro' | 'flying' | 'approaching' | 'landed' | 'booking' | 'confirmed'`
  - `type GameEvent = { type: 'INTRO_DONE' } | { type: 'ENTER_RANGE'; destId: string } | { type: 'EXIT_RANGE' } | { type: 'LAND' } | { type: 'TAKE_OFF' } | { type: 'OPEN_BOOKING' } | { type: 'BOOKED' } | { type: 'CLOSE_BOOKING'; returnTo: 'flying' | 'landed' } | { type: 'DONE' }`
  - `transition(state: GameStateName, ev: GameEvent): GameStateName` (pure; invalid → same state)
  - `useGame` zustand hook with `{ state, flight, activeDestId, bookingReturnTo, send(ev), tick(input, dtSec), flyTo(destId), reset() }`

- [ ] **Step 1: Write failing test `src/game/machine.test.ts`**

```ts
import { transition } from './machine';

test.each([
  ['intro', { type: 'INTRO_DONE' }, 'flying'],
  ['flying', { type: 'ENTER_RANGE', destId: 'oahu' }, 'approaching'],
  ['approaching', { type: 'EXIT_RANGE' }, 'flying'],
  ['approaching', { type: 'LAND' }, 'landed'],
  ['landed', { type: 'TAKE_OFF' }, 'flying'],
  ['landed', { type: 'OPEN_BOOKING' }, 'booking'],
  ['flying', { type: 'OPEN_BOOKING' }, 'booking'],
  ['booking', { type: 'BOOKED' }, 'confirmed'],
  ['booking', { type: 'CLOSE_BOOKING', returnTo: 'landed' }, 'landed'],
  ['booking', { type: 'CLOSE_BOOKING', returnTo: 'flying' }, 'flying'],
  ['confirmed', { type: 'DONE' }, 'flying'],
] as const)('%s + %o → %s', (from, ev, to) => {
  expect(transition(from, ev as any)).toBe(to);
});

test('invalid events do not change state', () => {
  expect(transition('flying', { type: 'LAND' })).toBe('flying');
  expect(transition('intro', { type: 'BOOKED' })).toBe('intro');
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/game/machine.ts`**

```ts
export type GameStateName = 'intro' | 'flying' | 'approaching' | 'landed' | 'booking' | 'confirmed';

export type GameEvent =
  | { type: 'INTRO_DONE' }
  | { type: 'ENTER_RANGE'; destId: string }
  | { type: 'EXIT_RANGE' }
  | { type: 'LAND' }
  | { type: 'TAKE_OFF' }
  | { type: 'OPEN_BOOKING' }
  | { type: 'BOOKED' }
  | { type: 'CLOSE_BOOKING'; returnTo: 'flying' | 'landed' }
  | { type: 'DONE' };

export function transition(state: GameStateName, ev: GameEvent): GameStateName {
  switch (state) {
    case 'intro':
      return ev.type === 'INTRO_DONE' ? 'flying' : state;
    case 'flying':
      if (ev.type === 'ENTER_RANGE') return 'approaching';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'approaching':
      if (ev.type === 'EXIT_RANGE') return 'flying';
      if (ev.type === 'LAND') return 'landed';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'landed':
      if (ev.type === 'TAKE_OFF') return 'flying';
      if (ev.type === 'OPEN_BOOKING') return 'booking';
      return state;
    case 'booking':
      if (ev.type === 'BOOKED') return 'confirmed';
      if (ev.type === 'CLOSE_BOOKING') return ev.returnTo;
      return state;
    case 'confirmed':
      return ev.type === 'DONE' ? 'flying' : state;
  }
}
```

Run: `npm test` → machine tests PASS.

- [ ] **Step 3: Write failing test `src/game/store.test.ts`**

```ts
import { useGame } from './store';

beforeEach(() => useGame.getState().reset());

test('starts in intro over the Pacific', () => {
  expect(useGame.getState().state).toBe('intro');
});

test('tick is a no-op during intro', () => {
  const before = useGame.getState().flight;
  useGame.getState().tick({ dx: 1, dy: 0 }, 1);
  expect(useGame.getState().flight).toEqual(before);
});

test('flying near a destination raises ENTER_RANGE and sets activeDestId', () => {
  const g = useGame.getState();
  g.send({ type: 'INTRO_DONE' });
  useGame.setState({ flight: { lat: 20, lng: -162, headingDeg: 90 } });
  useGame.getState().tick({ dx: 1, dy: 0 }, 0.1);
  expect(useGame.getState().state).toBe('approaching');
  expect(useGame.getState().activeDestId).toBe('oahu');
});

test('flying away again raises EXIT_RANGE and clears activeDestId', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.setState({ state: 'approaching', activeDestId: 'oahu', flight: { lat: 20, lng: -158, headingDeg: 0 } });
  useGame.setState({ flight: { lat: 20, lng: -100, headingDeg: 0 } });
  useGame.getState().tick({ dx: 0, dy: 0 }, 0.01);
  expect(useGame.getState().state).toBe('flying');
  expect(useGame.getState().activeDestId).toBeNull();
});

test('OPEN_BOOKING remembers where to return', () => {
  useGame.setState({ state: 'landed', activeDestId: 'bali' });
  useGame.getState().send({ type: 'OPEN_BOOKING' });
  expect(useGame.getState().bookingReturnTo).toBe('landed');
  useGame.getState().send({ type: 'CLOSE_BOOKING', returnTo: useGame.getState().bookingReturnTo });
  expect(useGame.getState().state).toBe('landed');
});

test('flyTo teleports into approaching at the destination', () => {
  useGame.getState().send({ type: 'INTRO_DONE' });
  useGame.getState().flyTo('jbay');
  const g = useGame.getState();
  expect(g.state).toBe('approaching');
  expect(g.activeDestId).toBe('jbay');
  expect(g.flight.lat).toBeCloseTo(-34.05);
});
```

- [ ] **Step 4: Run `npm test` → FAIL. Install zustand and implement `src/game/store.ts`**

```bash
npm i zustand
```

```ts
import { create } from 'zustand';
import { transition, type GameEvent, type GameStateName } from './machine';
import { stepFlight, nearestDestination, type FlightState, type FlightInput } from './flight';
import { DESTINATIONS, LANDING_RANGE_DEG, destinationById } from '../data/destinations';

interface GameStore {
  state: GameStateName;
  flight: FlightState;
  activeDestId: string | null;
  bookingReturnTo: 'flying' | 'landed';
  send: (ev: GameEvent) => void;
  tick: (input: FlightInput, dtSec: number) => void;
  flyTo: (destId: string) => void;
  reset: () => void;
}

const INITIAL = {
  state: 'intro' as GameStateName,
  // mid-Pacific start: Oahu is a short first flight away
  flight: { lat: 8, lng: -140, headingDeg: 0 } as FlightState,
  activeDestId: null as string | null,
  bookingReturnTo: 'flying' as const,
};

export const useGame = create<GameStore>((set, get) => ({
  ...INITIAL,

  send: (ev) => {
    const from = get().state;
    const to = transition(from, ev);
    if (to === from && ev.type !== 'ENTER_RANGE') return set({});
    const patch: Partial<GameStore> = { state: to };
    if (ev.type === 'ENTER_RANGE') patch.activeDestId = ev.destId;
    if (ev.type === 'EXIT_RANGE') patch.activeDestId = null;
    if (ev.type === 'OPEN_BOOKING') patch.bookingReturnTo = from === 'landed' ? 'landed' : 'flying';
    if (ev.type === 'DONE') patch.activeDestId = null;
    set(patch);
  },

  tick: (input, dtSec) => {
    const { state, flight, send } = get();
    if (state !== 'flying' && state !== 'approaching') return;
    const next = stepFlight(flight, input, dtSec);
    set({ flight: next });
    const near = nearestDestination(next, DESTINATIONS, LANDING_RANGE_DEG);
    if (near && state === 'flying') send({ type: 'ENTER_RANGE', destId: near.dest.id });
    else if (near && state === 'approaching' && near.dest.id !== get().activeDestId) {
      set({ activeDestId: near.dest.id });
    } else if (!near && state === 'approaching') send({ type: 'EXIT_RANGE' });
  },

  flyTo: (destId) => {
    const dest = destinationById(destId);
    if (!dest) return;
    const state = get().state;
    if (state === 'intro') get().send({ type: 'INTRO_DONE' });
    set({
      state: 'approaching',
      activeDestId: dest.id,
      flight: { lat: dest.lat, lng: dest.lng, headingDeg: 90 },
    });
  },

  reset: () => set({ ...INITIAL }),
}));
```

- [ ] **Step 5: Run `npm test` → PASS. Commit**

```bash
git add src/game package.json package-lock.json
git commit -m "feat: game state machine and zustand store with proximity events"
```

---

### Task 6: Keyboard controls hook

**Files:**
- Create: `src/hooks/useKeyboardControls.ts`
- Test: `src/hooks/useKeyboardControls.test.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 5).
- Produces: `useKeyboardControls(): { getInput(): FlightInput }` — holds arrow-key state in a ref (no re-renders); `Space` sends `LAND` (approaching) / `TAKE_OFF` (landed) / `DONE` (confirmed); `Escape` sends `CLOSE_BOOKING` (booking) / `TAKE_OFF` (landed). Ignores keys when `document.activeElement` is an input/textarea/select.

- [ ] **Step 1: Write failing test `src/hooks/useKeyboardControls.test.tsx`**

```tsx
import { renderHook, act } from '@testing-library/react';
import { useKeyboardControls } from './useKeyboardControls';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

const key = (type: 'keydown' | 'keyup', keyName: string) =>
  act(() => { window.dispatchEvent(new KeyboardEvent(type, { key: keyName })); });

test('arrow keys map to a flight input vector', () => {
  const { result } = renderHook(() => useKeyboardControls());
  key('keydown', 'ArrowUp');
  key('keydown', 'ArrowRight');
  expect(result.current.getInput()).toEqual({ dx: 1, dy: 1 });
  key('keyup', 'ArrowUp');
  expect(result.current.getInput()).toEqual({ dx: 1, dy: 0 });
});

test('Space lands when approaching and takes off when landed', () => {
  renderHook(() => useKeyboardControls());
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  key('keydown', ' ');
  expect(useGame.getState().state).toBe('landed');
  key('keydown', ' ');
  expect(useGame.getState().state).toBe('flying');
});

test('Escape closes booking back to where it came from', () => {
  renderHook(() => useKeyboardControls());
  useGame.setState({ state: 'booking', bookingReturnTo: 'landed' });
  key('keydown', 'Escape');
  expect(useGame.getState().state).toBe('landed');
});

test('typing in a form field never steers the bird', () => {
  const { result } = renderHook(() => useKeyboardControls());
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  key('keydown', 'ArrowRight');
  expect(result.current.getInput()).toEqual({ dx: 0, dy: 0 });
  input.remove();
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/hooks/useKeyboardControls.ts`**

```ts
import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import type { FlightInput } from '../game/flight';

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useKeyboardControls(): { getInput: () => FlightInput } {
  const pressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const inForm = () => FORM_TAGS.has(document.activeElement?.tagName ?? '');

    const onKeyDown = (e: KeyboardEvent) => {
      if (inForm()) return;
      if (e.key.startsWith('Arrow')) { pressed.current.add(e.key); e.preventDefault(); return; }
      const { state, send, bookingReturnTo } = useGame.getState();
      if (e.key === ' ') {
        if (state === 'approaching') send({ type: 'LAND' });
        else if (state === 'landed') send({ type: 'TAKE_OFF' });
        else if (state === 'confirmed') send({ type: 'DONE' });
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (state === 'booking') send({ type: 'CLOSE_BOOKING', returnTo: bookingReturnTo });
        else if (state === 'landed') send({ type: 'TAKE_OFF' });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => pressed.current.delete(e.key);
    const onBlur = () => pressed.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return {
    getInput: () => {
      const p = pressed.current;
      const dx = ((p.has('ArrowRight') ? 1 : 0) - (p.has('ArrowLeft') ? 1 : 0)) as -1 | 0 | 1;
      const dy = ((p.has('ArrowUp') ? 1 : 0) - (p.has('ArrowDown') ? 1 : 0)) as -1 | 0 | 1;
      return { dx, dy };
    },
  };
}
```

- [ ] **Step 3: Run `npm test` → PASS. Commit**

```bash
git add src/hooks && git commit -m "feat: keyboard controls hook (arrows fly, Space lands, Esc closes)"
```

---

### Task 7: 3D scene — geo helpers, globe, markers, bird (static)

**Files:**
- Create: `src/scene/geo.ts`, `src/scene/GlobeScene.tsx`, `src/scene/Globe.tsx`, `src/scene/Markers.tsx`, `src/scene/Bird.tsx`, `src/scene/webgl.ts`, `src/hooks/useReducedMotion.ts`
- Test: `src/scene/geo.test.ts`

**Interfaces:**
- Consumes: `DESTINATIONS` (Task 3), `useGame` (Task 5).
- Produces: `latLngToVec3(lat, lng, radius): [number, number, number]` (lat 0/lng 0 → +Z); `<GlobeScene getInput={() => FlightInput} />` renders the full Canvas; `isWebGLAvailable(): boolean`; `useReducedMotion(): boolean`. Globe radius is `1`; bird hovers screen-fixed at `[0, 0.18, 1.25]` relative to a camera at `z = 3.2`; globe rotates so `flight.lat/lng` faces the camera (nested groups: outer `rotation.x = rad(lat)`, inner `rotation.y = rad(-lng)`).

- [ ] **Step 1: Write failing test `src/scene/geo.test.ts`**

```ts
import { latLngToVec3 } from './geo';

test('lat 0 lng 0 points at +Z', () => {
  const [x, y, z] = latLngToVec3(0, 0, 1);
  expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(1);
});

test('north pole points at +Y', () => {
  const [x, y, z] = latLngToVec3(90, 0, 1);
  expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(1); expect(z).toBeCloseTo(0);
});

test('lng 90 points at +X and radius scales', () => {
  const [x, y, z] = latLngToVec3(0, 90, 2);
  expect(x).toBeCloseTo(2); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(0);
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/scene/geo.ts`**

```ts
export const rad = (d: number) => (d * Math.PI) / 180;

/** lat/lng (deg) → position on a sphere of given radius; (0,0) faces +Z. */
export function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const φ = rad(lat), λ = rad(lng);
  return [radius * Math.cos(φ) * Math.sin(λ), radius * Math.sin(φ), radius * Math.cos(φ) * Math.cos(λ)];
}
```

Run: `npm test` → geo tests PASS.

- [ ] **Step 3: Install R3F and create `src/scene/webgl.ts` + `src/hooks/useReducedMotion.ts`**

```bash
npm i three @react-three/fiber @react-three/drei
npm i -D @types/three
```

```ts
// src/scene/webgl.ts
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

```ts
// src/hooks/useReducedMotion.ts
import { useSyncExternalStore } from 'react';

const query = () => window.matchMedia('(prefers-reduced-motion: reduce)');

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { const mq = query(); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => query().matches,
    () => false,
  );
}
```

- [ ] **Step 4: Create `src/scene/Globe.tsx`** (toy globe: flat-shaded sphere, blob continents as flattened spheres pinned by lat/lng, palm cones, orbiting cloud puffs)

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { latLngToVec3 } from './geo';

const CONTINENTS: { lat: number; lng: number; scale: number; color: string }[] = [
  { lat: 45, lng: -100, scale: 0.55, color: '#8ED081' },  // North America
  { lat: -10, lng: -60, scale: 0.45, color: '#5FB56E' },  // South America
  { lat: 12, lng: 20, scale: 0.55, color: '#F2D8A7' },    // Africa
  { lat: 50, lng: 60, scale: 0.6, color: '#8ED081' },     // Eurasia
  { lat: -25, lng: 135, scale: 0.35, color: '#F2D8A7' },  // Australia
  { lat: 21, lng: -158, scale: 0.12, color: '#8ED081' },  // Hawaii dot
];

function Blob({ lat, lng, scale, color }: (typeof CONTINENTS)[number]) {
  const pos = latLngToVec3(lat, lng, 0.98);
  return (
    <mesh position={pos} scale={[scale, scale * 0.7, 0.08]}
      onUpdate={(m) => m.lookAt(0, 0, 0)}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

function Clouds({ animate }: { animate: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => { if (animate && ref.current) ref.current.rotation.y += dt * 0.02; });
  const puffs: [number, number][] = [[30, 40], [-20, 150], [10, -60], [55, -150], [-45, 80]];
  return (
    <group ref={ref}>
      {puffs.map(([lat, lng], i) => (
        <mesh key={i} position={latLngToVec3(lat, lng, 1.12)} scale={[0.16, 0.07, 0.1]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}

export function Globe({ animateClouds }: { animateClouds: boolean }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 32, 24]} />
        <meshToonMaterial color="#2FA8BC" />
      </mesh>
      {CONTINENTS.map((c, i) => <Blob key={i} {...c} />)}
      <Clouds animate={animateClouds} />
    </group>
  );
}
```

- [ ] **Step 5: Create `src/scene/Markers.tsx`**

```tsx
import { DESTINATIONS } from '../data/destinations';
import { useGame } from '../game/store';
import { latLngToVec3 } from './geo';

export function Markers() {
  const activeDestId = useGame((g) => g.activeDestId);
  return (
    <group>
      {DESTINATIONS.map((d) => {
        const active = d.id === activeDestId;
        return (
          <group key={d.id} position={latLngToVec3(d.lat, d.lng, 1.0)}
            onUpdate={(g) => g.lookAt(0, 0, 0)}>
            {/* pin pole + head; +Z of this group points to globe center, so stack along -Z */}
            <mesh position={[0, 0, -0.06]}>
              <cylinderGeometry args={[0.008, 0.008, 0.12]} />
              <meshToonMaterial color="#14353E" />
            </mesh>
            <mesh position={[0, 0, -0.13]} scale={active ? 1.5 : 1}>
              <sphereGeometry args={[0.035, 12, 10]} />
              <meshToonMaterial color={active ? '#FFD166' : '#FF7E6B'} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
```

Note: `cylinderGeometry`'s axis is Y; after `lookAt(0,0,0)` the group's -Z points away from the globe — rotate the pole into place with `rotation={[Math.PI / 2, 0, 0]}` on the cylinder mesh if it renders sideways (verify visually in Step 8).

- [ ] **Step 6: Create `src/scene/Bird.tsx`** (screen-fixed Nalu; bob + bank driven by input)

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useGame } from '../game/store';
import type { FlightInput } from '../game/flight';

export function Bird({ getInput, animate }: { getInput: () => FlightInput; animate: boolean }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current += dt;
    const input = getInput();
    const state = useGame.getState().state;
    const flying = state === 'flying' || state === 'approaching';
    const bob = animate && flying ? Math.sin(t.current * 3) * 0.02 : 0;
    const targetRoll = flying ? -input.dx * 0.5 : 0;
    const targetPitch = flying ? input.dy * 0.25 : 0;
    ref.current.position.y = 0.18 + bob + (state === 'landed' ? -0.12 : 0);
    ref.current.rotation.z += (targetRoll - ref.current.rotation.z) * Math.min(1, dt * 6);
    ref.current.rotation.x += (targetPitch - ref.current.rotation.x) * Math.min(1, dt * 6);
  });

  return (
    <group ref={ref} position={[0, 0.18, 1.25]} scale={0.09}>
      <mesh scale={[1.4, 1, 1]}>
        <sphereGeometry args={[1, 14, 12]} />
        <meshToonMaterial color="#B7A98D" />
      </mesh>
      <mesh position={[0, -0.4, 0.3]} scale={[0.8, 0.5, 0.6]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshToonMaterial color="#FFFDF7" />
      </mesh>
      <mesh position={[0.9, 0.7, 0]} scale={0.55}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial color="#14353E" />
      </mesh>
      <mesh position={[1.05, 0.55, 0.35]} scale={[0.28, 0.18, 0.18]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color="#F5E9C9" />
      </mesh>
      <mesh position={[1.5, 0.7, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.18, 0.3, 0.18]}>
        <coneGeometry args={[1, 1.4, 8]} />
        <meshToonMaterial color="#FF9A57" />
      </mesh>
      {/* wings */}
      <mesh position={[-0.2, 0.25, 0.9]} rotation={[0.3, 0, 0.2]} scale={[1.1, 0.15, 0.5]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color="#8D7F63" />
      </mesh>
      <mesh position={[-0.2, 0.25, -0.9]} rotation={[-0.3, 0, 0.2]} scale={[1.1, 0.15, 0.5]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshToonMaterial color="#8D7F63" />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 7: Create `src/scene/GlobeScene.tsx`** (Canvas root + rotation rig + tick loop)

```tsx
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useGame } from '../game/store';
import { shortestAngleDeg, type FlightInput } from '../game/flight';
import { rad } from './geo';
import { Globe } from './Globe';
import { Markers } from './Markers';
import { Bird } from './Bird';

function Rig({ getInput, children }: { getInput: () => FlightInput; children: React.ReactNode }) {
  const outer = useRef<Group>(null); // rotation.x = rad(lat)
  const inner = useRef<Group>(null); // rotation.y = rad(-lng)
  const shown = useRef({ lat: 8, lng: -140 });

  useFrame((_, rawDt) => {
    if (document.hidden) return;
    const dt = Math.min(rawDt, 0.1);
    useGame.getState().tick(getInput(), dt);
    const { flight } = useGame.getState();
    const s = shown.current;
    const k = Math.min(1, dt * 5);
    s.lat += (flight.lat - s.lat) * k;
    s.lng += shortestAngleDeg(s.lng, flight.lng) * k;
    if (outer.current) outer.current.rotation.x = rad(s.lat);
    if (inner.current) inner.current.rotation.y = rad(-s.lng);
  });

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

export function GlobeScene({ getInput, animate }: { getInput: () => FlightInput; animate: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.2], fov: 50 }} // recorded decision: measured margin fix, Task 7
      style={{ position: 'fixed', inset: 0 }}
      aria-hidden
    >
      <color attach="background" args={['#8FE3DB']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Rig getInput={getInput}>
        <Globe animateClouds={animate} />
        <Markers />
      </Rig>
      <Bird getInput={getInput} animate={animate} />
    </Canvas>
  );
}
```

- [ ] **Step 8: Manual visual verification** (scene components are eyeballed, not unit-tested)

Temporarily render `<GlobeScene getInput={() => ({ dx: 0, dy: 0 })} animate />` from the scaffold's entry component (`ENTRY_COMPONENT` in `docs/scaffold-notes.md`). Run `npm run dev` and confirm: whole globe visible with margin; 6 pins visible while rotating; bird centered above the globe, facing right; clouds drift; nothing z-fights. Fix marker pole orientation here if needed (see Task 7 Step 5 note). Revert the temporary render.

- [ ] **Step 9: Run `npm test` (still green) and commit**

```bash
git add src/scene src/hooks package.json package-lock.json
git commit -m "feat: R3F toy globe scene with markers and screen-fixed bird"
```

---

### Task 8: Styles + App shell + intro dialogue

**Files:**
- Create: `src/styles/game.css`, `src/ui/dialogue.ts`, `src/ui/SpeechBubble.tsx`, `src/App.tsx` (replace scaffold's root component content; wire via `ENTRY_COMPONENT`)
- Test: `src/ui/SpeechBubble.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `useKeyboardControls`, `GlobeScene`, `isWebGLAvailable`, `useReducedMotion`.
- Produces: `INTRO_LINES: string[]`; `<SpeechBubble lines={string[]} cta={string} onDone={() => void} instant={boolean} />` — advances per click/Enter, shows `cta` button on last line, calls `onDone`; `App` renders scene + overlay switch (fleshed out in later tasks); CSS classes used by all later UI: `.bb-card`, `.bb-btn`, `.bb-btn--sun`, `.bb-bubble`, `.bb-toast`, `.bb-chip`, `.bb-key`, `.bb-info`, `.bb-modal`, `.bb-drawer`, `.bb-scrim`, `.bb-navtab`, `.bb-pill`.

- [ ] **Step 1: Install the font**

```bash
npm i @fontsource/fredoka
```

- [ ] **Step 2: Create `src/styles/game.css`** (complete file — later tasks add nothing to it unless stated)

```css
@import '@fontsource/fredoka/400.css';
@import '@fontsource/fredoka/600.css';

:root {
  --lagoon: #2FA8BC; --sky: #8FE3DB; --coral: #FF7E6B; --coral-deep: #E85F4C;
  --sun: #FFD166; --sand: #F2D8A7; --leaf: #8ED081; --ink: #14353E; --card: #FFFDF7;
  --font: 'Fredoka', ui-rounded, sans-serif;
}

html, body { margin: 0; height: 100%; overflow: hidden; font-family: var(--font); color: var(--ink); }

.bb-card {
  background: var(--card); border: 3px solid var(--ink); border-radius: 18px;
  box-shadow: 0 5px 0 rgba(20, 53, 62, 0.28); padding: 16px 18px;
}
.bb-btn {
  font-family: var(--font); font-size: 16px; padding: 10px 18px; border-radius: 999px;
  background: var(--coral); color: #fff; border: 3px solid var(--ink); cursor: pointer;
  box-shadow: 0 3px 0 rgba(20, 53, 62, 0.3);
}
.bb-btn--sun { background: var(--sun); color: var(--ink); }
.bb-btn:focus-visible, .bb-navtab:focus-visible { outline: 3px solid var(--sun); outline-offset: 2px; }
.bb-btn:disabled { opacity: 0.55; cursor: default; }

.bb-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
.bb-overlay > * { pointer-events: auto; }

.bb-bubble { position: fixed; left: 52%; top: 10%; width: min(360px, 38vw); }
.bb-bubble::before {
  content: ''; position: absolute; left: -13px; top: 40%; width: 18px; height: 18px;
  background: var(--card); border-left: 3px solid var(--ink); border-bottom: 3px solid var(--ink);
  transform: rotate(45deg);
}
.bb-bubble .who { display: block; font-size: 12px; letter-spacing: 0.12em; color: var(--coral-deep); margin-bottom: 4px; }

.bb-toast { position: fixed; left: 50%; bottom: 7%; transform: translateX(-50%); padding: 12px 20px; border-radius: 999px; font-size: 17px; }
.bb-chip { position: fixed; left: 50%; bottom: 6%; transform: translateX(-50%); padding: 8px 16px; border-radius: 999px; font-size: 14px; transition: opacity 0.6s; }
.bb-key { display: inline-block; border: 2.5px solid var(--ink); border-radius: 6px; padding: 0 7px; margin: 0 2px; background: #fff; box-shadow: 0 2px 0 rgba(20, 53, 62, 0.3); font-size: 0.9em; }

.bb-info { position: fixed; right: 3%; top: 6%; bottom: 6%; width: min(360px, 31vw); display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.bb-info h2 { margin: 0; font-size: 26px; line-height: 1.15; }
.bb-info .eyebrow { font-size: 11px; letter-spacing: 0.16em; color: var(--coral-deep); }
.bb-info ul { margin: 2px 0; padding-left: 18px; line-height: 1.45; }
.bb-info .cta { margin-top: auto; }
.bb-pill { display: inline-block; border: 2.5px solid var(--ink); border-radius: 999px; padding: 2px 10px; background: var(--sky); font-size: 13px; margin: 0 4px 4px 0; }
.bb-pill--warm { background: var(--sand); }

.bb-modal { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(640px, 92vw); max-height: 88vh; overflow-y: auto; }
.bb-modal h2 { margin: 0 0 2px; font-size: 24px; }
.bb-cols { display: flex; gap: 16px; flex-wrap: wrap; }
.bb-cols > * { flex: 1 1 240px; }
.bb-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.bb-day {
  aspect-ratio: 1; display: grid; place-items: center; border: 2px solid var(--ink);
  border-radius: 8px; background: #fff; font-family: var(--font); font-size: 13px; cursor: pointer;
}
.bb-day:disabled { opacity: 0.28; border-style: dashed; cursor: default; }
.bb-day[aria-pressed='true'] { background: var(--coral); color: #fff; }
.bb-day--has { background: var(--sky); }
.bb-slot { border: 2.5px solid var(--ink); border-radius: 999px; padding: 5px 12px; background: #fff; font-family: var(--font); cursor: pointer; margin: 0 6px 6px 0; }
.bb-slot[aria-pressed='true'] { background: var(--sun); }
.bb-field { display: block; width: 100%; box-sizing: border-box; border: 2.5px solid var(--ink); border-radius: 10px; padding: 9px 10px; font-family: var(--font); font-size: 15px; margin-bottom: 8px; }
.bb-caption { font-size: 12px; color: #7A959B; }
.bb-error { color: var(--coral-deep); font-size: 14px; }

.bb-navtab {
  position: fixed; left: 0; top: 38%; z-index: 20; writing-mode: vertical-rl; letter-spacing: 0.14em;
  background: var(--card); border: 3px solid var(--ink); border-left: none; border-radius: 0 14px 14px 0;
  padding: 14px 9px; font-family: var(--font); font-size: 13px; cursor: pointer;
  box-shadow: 3px 4px 0 rgba(20, 53, 62, 0.25);
}
.bb-scrim { position: fixed; inset: 0; background: rgba(20, 53, 62, 0.35); z-index: 25; border: none; }
.bb-drawer {
  position: fixed; left: 0; top: 0; bottom: 0; width: min(320px, 82vw); z-index: 30;
  border-radius: 0 22px 22px 0; border-left: none; display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
}
.bb-drawer .sect { font-size: 11px; letter-spacing: 0.16em; color: var(--coral-deep); margin-top: 10px; }
.bb-drawer button.link { display: block; width: 100%; text-align: left; background: none; border: none; font-family: var(--font); font-size: 15px; color: var(--ink); padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.bb-drawer button.link:hover { background: var(--sky); }

.bb-center { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(420px, 92vw); text-align: center; }
.bb-stamp { width: 54px; height: 54px; margin: 0 auto 8px; border-radius: 50%; background: var(--leaf); border: 3px solid var(--ink); display: grid; place-items: center; font-size: 26px; }

.bb-dpad { position: fixed; left: 4%; bottom: 4%; display: grid; grid-template: repeat(3, 56px) / repeat(3, 56px); gap: 4px; z-index: 15; }
.bb-dpad button { border: 2.5px solid var(--ink); border-radius: 10px; background: var(--card); font-size: 18px; box-shadow: 0 3px 0 rgba(20, 53, 62, 0.3); }
.bb-land { position: fixed; right: 4%; bottom: 5%; width: 92px; height: 92px; border-radius: 50%; background: var(--coral); color: #fff; border: 3px solid var(--ink); font-family: var(--font); font-size: 16px; box-shadow: 0 4px 0 rgba(20, 53, 62, 0.3); z-index: 15; }
.bb-land:disabled { opacity: 0.45; }

.bb-fallback { height: 100%; overflow-y: auto; background: var(--sky); padding: 24px; box-sizing: border-box; }

@media (max-width: 720px) {
  .bb-info { right: 0; left: 0; top: auto; bottom: 0; width: auto; max-height: 60vh; border-radius: 18px 18px 0 0; }
  .bb-modal { top: auto; bottom: 0; transform: translateX(-50%); border-radius: 18px 18px 0 0; max-height: 80vh; }
  .bb-bubble { left: 8%; width: 84vw; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 3: Create `src/ui/dialogue.ts`**

```ts
export const INTRO_LINES = [
  "Aloha! I'm Nalu — nene, pilot, and full-time wave chaser. Welcome to Birdie Breaks, your surf-travel agency.",
  'See those pins down there? Each one is a surf trip I can take you on. Steer me with the arrow keys — ← → ↑ ↓ — and press Space when we get close, to land.',
  "Find a break you like and I'll book you a planning session with our agent. Ready?",
];
export const INTRO_CTA = "Let's fly!";
export const NALU = 'NALU';
```

- [ ] **Step 4: Write failing test `src/ui/SpeechBubble.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeechBubble } from './SpeechBubble';

test('advances through lines and fires onDone from the CTA', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<SpeechBubble lines={['one', 'two']} cta="Go!" onDone={onDone} instant />);
  expect(screen.getByText('one')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Go!' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /next/i }));
  expect(screen.getByText('two')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Go!' }));
  expect(onDone).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Run `npm test` → FAIL. Implement `src/ui/SpeechBubble.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { NALU } from './dialogue';

interface Props { lines: string[]; cta: string; onDone: () => void; instant?: boolean }

export function SpeechBubble({ lines, cta, onDone, instant = false }: Props) {
  const [i, setI] = useState(0);
  const [chars, setChars] = useState(instant ? Infinity : 0);
  const line = lines[i];
  const last = i === lines.length - 1;
  const fullyTyped = chars >= line.length;

  useEffect(() => {
    if (instant) return;
    setChars(0);
    const id = setInterval(() => setChars((c) => c + 2), 33);
    return () => clearInterval(id);
  }, [i, instant]);

  const advance = () => {
    if (!fullyTyped) return setChars(Infinity);
    if (!last) setI(i + 1);
  };

  return (
    <div className="bb-card bb-bubble" role="dialog" aria-label="Nalu says">
      <span className="who">{NALU}</span>
      <p style={{ margin: 0 }}>{instant || fullyTyped ? line : line.slice(0, chars)}</p>
      {last && fullyTyped
        ? <button className="bb-btn" onClick={onDone}>{cta}</button>
        : <button className="bb-btn bb-btn--sun" onClick={advance} aria-label="next">▸</button>}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/App.tsx`** (composition shell; overlays land here in later tasks)

```tsx
import './styles/game.css';
import { useGame } from './game/store';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useReducedMotion } from './hooks/useReducedMotion';
import { isWebGLAvailable } from './scene/webgl';
import { GlobeScene } from './scene/GlobeScene';
import { SpeechBubble } from './ui/SpeechBubble';
import { INTRO_LINES, INTRO_CTA } from './ui/dialogue';

export default function App() {
  const state = useGame((g) => g.state);
  const send = useGame((g) => g.send);
  const { getInput } = useKeyboardControls();
  const reducedMotion = useReducedMotion();

  if (!isWebGLAvailable()) {
    return <div className="bb-fallback">{/* FallbackView mounts here in Task 12 */}</div>;
  }

  return (
    <>
      <GlobeScene getInput={getInput} animate={!reducedMotion} />
      <div className="bb-overlay">
        {state === 'intro' && (
          <SpeechBubble lines={INTRO_LINES} cta={INTRO_CTA} instant={reducedMotion}
            onDone={() => send({ type: 'INTRO_DONE' })} />
        )}
        {/* Task 9: HintToast + controls chip · Task 10: InfoCard · Task 11-12: BookingCalendar/Confirmed · Task 13: SideNav · Task 14: TouchControls */}
      </div>
    </>
  );
}
```

Wire it: in `ENTRY_COMPONENT` (from `docs/scaffold-notes.md` — `src/pages/index.astro`), replace the scaffold placeholder content with `<App client:only="react" />` (import from `../App`; keep the scaffold's layout wrapper if it provides `<head>`). Set the page/document title to `Birdie Breaks` in that page or its layout.

- [ ] **Step 7: Run `npm test` → PASS; `npm run dev` → intro bubble over the globe, "Let's fly!" starts flight (arrows steer, globe rotates). Commit**

```bash
git add -A && git commit -m "feat: app shell with intro dialogue, game styles, and flight wiring"
```

---

### Task 9: Approach flow — HintToast + controls chip

**Files:**
- Create: `src/ui/HintToast.tsx`
- Modify: `src/App.tsx` (add toast + chip to overlay)
- Test: `src/ui/HintToast.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `destinationById`.
- Produces: `<HintToast />` — renders only in `approaching`, names the active destination; `<ControlsChip />` (exported from `HintToast.tsx`) — renders in `flying`, fades after 6 s. **Decision (user, 2026-07-09): the chip shows once per session — it does NOT reappear on later re-entries into `flying`. The non-resetting `faded` flag is intentional.**

- [ ] **Step 1: Write failing test `src/ui/HintToast.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { HintToast } from './HintToast';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

test('hidden while flying, shows destination while approaching', () => {
  useGame.setState({ state: 'flying' });
  const { rerender } = render(<HintToast />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  rerender(<HintToast />);
  expect(screen.getByRole('status')).toHaveTextContent(/land at Oahu — North Shore/);
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/ui/HintToast.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { destinationById } from '../data/destinations';

export function HintToast() {
  const state = useGame((g) => g.state);
  const destId = useGame((g) => g.activeDestId);
  const dest = destId ? destinationById(destId) : undefined;
  if (state !== 'approaching' || !dest) return null;
  return (
    <div className="bb-card bb-toast" role="status">
      {dest.emoji} Press <span className="bb-key">Space</span> to land at <b>{dest.name}</b>
    </div>
  );
}

export function ControlsChip() {
  const state = useGame((g) => g.state);
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (state !== 'flying') return;
    const id = setTimeout(() => setFaded(true), 6000);
    return () => clearTimeout(id);
  }, [state]);
  if (state !== 'flying' || faded) return null;
  return (
    <div className="bb-card bb-chip" role="note">
      <span className="bb-key">←</span><span className="bb-key">→</span>
      <span className="bb-key">↑</span><span className="bb-key">↓</span> fly ·{' '}
      <span className="bb-key">Space</span> land
    </div>
  );
}
```

- [ ] **Step 3: Mount both in `src/App.tsx`** inside `.bb-overlay`, replacing the Task-9 comment:

```tsx
<HintToast />
<ControlsChip />
```

with `import { HintToast, ControlsChip } from './ui/HintToast';`

- [ ] **Step 4: Run `npm test` → PASS; `npm run dev`: fly to Hawaii → pin brightens + toast appears; Space → state changes (nothing visible yet beyond toast disappearing — InfoCard is next). Commit**

```bash
git add -A && git commit -m "feat: approach hint toast and fading controls chip"
```

---

### Task 10: Landed flow — InfoCard

**Files:**
- Create: `src/ui/InfoCard.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/InfoCard.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `destinationById`.
- Produces: `<InfoCard />` — renders in `landed` for the active destination; CTA button labeled exactly **"Plan this trip with the agent"** sends `OPEN_BOOKING`; take-off hint sends `TAKE_OFF`.

- [ ] **Step 1: Write failing test `src/ui/InfoCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoCard } from './InfoCard';
import { useGame } from '../game/store';

beforeEach(() => {
  useGame.getState().reset();
  useGame.setState({ state: 'landed', activeDestId: 'ericeira' });
});

test('renders the destination facts', () => {
  render(<InfoCard />);
  expect(screen.getByRole('heading', { name: /Ericeira/ })).toBeInTheDocument();
  expect(screen.getByText('Sep – Nov')).toBeInTheDocument();
  expect(screen.getByText(/Coxos/)).toBeInTheDocument();
  expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
  expect(screen.getByText(/18°C/)).toBeInTheDocument();
});

test('CTA opens booking, take-off returns to flight', async () => {
  const user = userEvent.setup();
  render(<InfoCard />);
  await user.click(screen.getByRole('button', { name: 'Plan this trip with the agent' }));
  expect(useGame.getState().state).toBe('booking');
  expect(useGame.getState().bookingReturnTo).toBe('landed');
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/ui/InfoCard.tsx`**

```tsx
import { useGame } from '../game/store';
import { destinationById } from '../data/destinations';

export function InfoCard() {
  const state = useGame((g) => g.state);
  const destId = useGame((g) => g.activeDestId);
  const send = useGame((g) => g.send);
  const dest = destId ? destinationById(destId) : undefined;
  if (state !== 'landed' || !dest) return null;

  return (
    <section className="bb-card bb-info" aria-label={`About ${dest.name}`}>
      <span className="eyebrow">DESTINATION</span>
      <h2>{dest.name} {dest.emoji}</h2>
      <div>
        <span className="bb-pill">{dest.bestWindow.months}</span>
        <span className="bb-pill bb-pill--warm">{dest.bestWindow.windNotes}</span>
        <span className="bb-pill bb-pill--warm">{dest.bestWindow.tideNotes}</span>
      </div>
      <ul>
        {dest.spots.map((s) => <li key={s.name}><b>{s.name}</b> — {s.note}</li>)}
      </ul>
      <p className="bb-caption">Skill: {dest.skillLevel} · Water: {dest.waterTemp} · {dest.country}</p>
      <button className="bb-btn cta" onClick={() => send({ type: 'OPEN_BOOKING' })}>
        Plan this trip with the agent
      </button>
      <button className="bb-btn bb-btn--sun" onClick={() => send({ type: 'TAKE_OFF' })}>
        Take off (Space)
      </button>
    </section>
  );
}
```

- [ ] **Step 3: Mount `<InfoCard />` in `App.tsx` overlay (replacing the Task-10 comment). Run `npm test` → PASS; `npm run dev`: land at a pin → card docks right, Space takes off. Commit**

```bash
git add -A && git commit -m "feat: landed info card with booking CTA"
```

---

### Task 11: Wix Bookings integration (client, mapping, api, myBooking)

**Files:**
- Create: `src/bookings/client.ts`, `src/bookings/mapping.ts`, `src/bookings/api.ts`, `src/bookings/myBooking.ts`
- Test: `src/bookings/mapping.test.ts`, `src/bookings/api.test.ts`, `src/bookings/myBooking.test.ts`

**Interfaces:**
- Consumes: scaffold's client id (`CLIENT_ID_SOURCE` in `docs/scaffold-notes.md`).
- Produces:
  - `createWixClient()` from `client.ts` — **the only module that touches @wix/sdk; every test mocks this module** (mock at the factory seam, never transitive deps).
  - `interface Slot { startISO: string; endISO: string }`, `interface DaySlots { dateISO: string; slots: Slot[] }` from `mapping.ts`; `groupSlotsByDay(entries, timeZone): DaySlots[]`; `formatTime(iso, timeZone): string` (e.g. `"11:30"`).
  - From `api.ts`: `getService(): Promise<{ id: string; name: string }>` (cached), `getAvailability(serviceId, fromISO, toISO, timeZone): Promise<DaySlots[]>`, `createBooking(slot: Slot, contact: { name: string; email: string }): Promise<{ bookingId: string }>`, error classes `AvailabilityError`, `SlotConflictError`.
  - From `myBooking.ts`: `interface MyBooking { bookingId: string; startISO: string; destName?: string }`, `saveMyBooking(b)`, `loadMyBooking(): MyBooking | null`, key `birdie-breaks.myBooking.v1`.
  - `SERVICE_NAME = 'Trip-planning session with your surf agent'`.

- [ ] **Step 0: One-time dashboard setup + connector docs (manual/discovery)**

1. Follow the wix-headless build skill's Bookings instructions: run its connector install (`npx wix skills add bookings` or as skill.md directs) and **read** the landed doc in `.agents/skills/` — it has the authoritative SDK call shapes.
2. In the Wix dashboard of the scaffolded site (`LIVE_URL`'s dashboard): Bookings → create service **"Trip-planning session with your surf agent"**, 30 min, online/video, and set the agent's working hours. Verify it appears.
3. If the connector doc's API names differ from the code below (`services.queryServices`, `availabilityCalendar.queryAvailability`, `bookings.createBooking`), **use the connector doc's names** and keep this task's exported interfaces unchanged.

- [ ] **Step 1: Write failing test `src/bookings/mapping.test.ts`**

```ts
import { groupSlotsByDay, formatTime } from './mapping';

const entry = (startISO: string, bookable = true) => ({
  bookable,
  slot: { startDate: startISO, endDate: new Date(new Date(startISO).getTime() + 30 * 60000).toISOString() },
});

test('groups bookable slots by local day, ordered', () => {
  const days = groupSlotsByDay([
    entry('2026-07-14T09:00:00Z'),
    entry('2026-07-14T15:00:00Z'),
    entry('2026-07-15T10:00:00Z'),
    entry('2026-07-14T11:00:00Z', false), // not bookable → dropped
  ], 'UTC');
  expect(days.map((d) => d.dateISO)).toEqual(['2026-07-14', '2026-07-15']);
  expect(days[0].slots).toHaveLength(2);
});

test('formatTime renders in the given time zone', () => {
  expect(formatTime('2026-07-14T09:00:00Z', 'UTC')).toBe('09:00');
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/bookings/mapping.ts`**

```ts
export interface Slot { startISO: string; endISO: string }
export interface DaySlots { dateISO: string; slots: Slot[] }

interface AvailabilityEntry { bookable?: boolean; slot?: { startDate?: string; endDate?: string } }

export function groupSlotsByDay(entries: AvailabilityEntry[], timeZone: string): DaySlots[] {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const byDay = new Map<string, Slot[]>();
  for (const e of entries) {
    if (!e.bookable || !e.slot?.startDate || !e.slot.endDate) continue;
    const dateISO = fmt.format(new Date(e.slot.startDate));
    const list = byDay.get(dateISO) ?? [];
    list.push({ startISO: e.slot.startDate, endISO: e.slot.endDate });
    byDay.set(dateISO, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, slots]) => ({
      dateISO,
      slots: slots.sort((a, b) => a.startISO.localeCompare(b.startISO)),
    }));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
```

Run: `npm test` → mapping PASS.

- [ ] **Step 3: Create `src/bookings/client.ts`** (reconcile with connector doc + scaffold; if the scaffold already exports a configured client, re-export it here instead — this file must remain the single seam)

```ts
import { createClient, OAuthStrategy } from '@wix/sdk';
import { services, availabilityCalendar, bookings } from '@wix/bookings';

// CLIENT_ID: copy the value/lookup from CLIENT_ID_SOURCE in docs/scaffold-notes.md
import { CLIENT_ID } from './config';

export function createWixClient() {
  return createClient({
    modules: { services, availabilityCalendar, bookings },
    auth: OAuthStrategy({ clientId: CLIENT_ID }),
  });
}
export type WixClient = ReturnType<typeof createWixClient>;
```

Also create `src/bookings/config.ts` exporting `CLIENT_ID` from wherever `CLIENT_ID_SOURCE` says it lives. Install if not present: `npm i @wix/sdk @wix/bookings`.

- [ ] **Step 4: Write failing test `src/bookings/api.test.ts`** (mocks the factory seam)

```ts
import { vi } from 'vitest';

const queryServices = vi.fn();
const queryAvailability = vi.fn();
const createBookingFn = vi.fn();

vi.mock('./client', () => ({
  createWixClient: () => ({
    services: { queryServices },
    availabilityCalendar: { queryAvailability },
    bookings: { createBooking: createBookingFn },
  }),
}));

import { getService, getAvailability, createBooking, SlotConflictError, AvailabilityError, SERVICE_NAME } from './api';

beforeEach(() => vi.clearAllMocks());

test('getService finds the trip-planning service by name and caches it', async () => {
  queryServices.mockReturnValue({
    eq: () => ({ find: async () => ({ items: [{ _id: 'svc-1', name: SERVICE_NAME }] }) }),
  });
  const first = await getService();
  expect(first).toEqual({ id: 'svc-1', name: SERVICE_NAME });
  await getService();
  expect(queryServices).toHaveBeenCalledTimes(1);
});

test('getAvailability maps entries into day groups', async () => {
  queryAvailability.mockResolvedValue({
    availabilityEntries: [
      { bookable: true, slot: { startDate: '2026-07-14T09:00:00Z', endDate: '2026-07-14T09:30:00Z' } },
    ],
  });
  const days = await getAvailability('svc-1', '2026-07-14T00:00:00Z', '2026-08-14T00:00:00Z', 'UTC');
  expect(days).toEqual([{ dateISO: '2026-07-14', slots: [{ startISO: '2026-07-14T09:00:00Z', endISO: '2026-07-14T09:30:00Z' }] }]);
});

test('getAvailability wraps failures in AvailabilityError', async () => {
  queryAvailability.mockRejectedValue(new Error('network'));
  await expect(getAvailability('svc-1', 'a', 'b', 'UTC')).rejects.toBeInstanceOf(AvailabilityError);
});

test('createBooking returns the id, and maps conflicts to SlotConflictError', async () => {
  createBookingFn.mockResolvedValue({ booking: { _id: 'bk-9' } });
  await expect(createBooking({ startISO: 's', endISO: 'e' }, { name: 'Kai', email: 'kai@x.com' }))
    .resolves.toEqual({ bookingId: 'bk-9' });
  createBookingFn.mockRejectedValue({ details: { applicationError: { code: 'SLOT_NOT_AVAILABLE' } } });
  await expect(createBooking({ startISO: 's', endISO: 'e' }, { name: 'Kai', email: 'kai@x.com' }))
    .rejects.toBeInstanceOf(SlotConflictError);
});
```

- [ ] **Step 5: Run `npm test` → FAIL. Implement `src/bookings/api.ts`**

```ts
import { createWixClient, type WixClient } from './client';
import { groupSlotsByDay, type DaySlots, type Slot } from './mapping';

export const SERVICE_NAME = 'Trip-planning session with your surf agent';

export class AvailabilityError extends Error {}
export class SlotConflictError extends Error {}

let client: WixClient | undefined;
let cachedService: { id: string; name: string } | undefined;

function wix(): WixClient {
  return (client ??= createWixClient());
}

export async function getService(): Promise<{ id: string; name: string }> {
  if (cachedService) return cachedService;
  const res = await wix().services.queryServices().eq('name', SERVICE_NAME).find();
  const svc = res.items?.[0];
  if (!svc) throw new AvailabilityError(`Service "${SERVICE_NAME}" not found — create it in the dashboard`);
  cachedService = { id: svc._id as string, name: svc.name as string };
  return cachedService;
}

export async function getAvailability(
  serviceId: string, fromISO: string, toISO: string, timeZone: string,
): Promise<DaySlots[]> {
  try {
    const res = await wix().availabilityCalendar.queryAvailability(
      { filter: { serviceId: [serviceId], startDate: fromISO, endDate: toISO } },
      { timezone: timeZone },
    );
    return groupSlotsByDay(res.availabilityEntries ?? [], timeZone);
  } catch (e) {
    throw new AvailabilityError(String(e));
  }
}

function isConflict(e: unknown): boolean {
  const code = (e as any)?.details?.applicationError?.code ?? '';
  return String(code).toUpperCase().includes('SLOT') || String(code) === '409';
}

export async function createBooking(
  slot: Slot, contact: { name: string; email: string },
): Promise<{ bookingId: string }> {
  const service = await getService();
  try {
    const res = await wix().bookings.createBooking({
      bookedEntity: {
        slot: { serviceId: service.id, startDate: slot.startISO, endDate: slot.endISO },
      },
      contactDetails: { firstName: contact.name, email: contact.email },
    });
    return { bookingId: (res as any).booking?._id ?? (res as any)._id };
  } catch (e) {
    if (isConflict(e)) throw new SlotConflictError(String(e));
    throw new AvailabilityError(String(e));
  }
}

/** Test-only: reset module caches. */
export function _resetForTests() { client = undefined; cachedService = undefined; }
```

Reconcile the two SDK call shapes with the connector doc from Step 0 (keep exports identical). Add `beforeEach(() => _resetForTests())` to `api.test.ts` if the cache test interferes.

- [ ] **Step 6: Write failing test `src/bookings/myBooking.test.ts` and implement `src/bookings/myBooking.ts`**

```ts
// test
import { saveMyBooking, loadMyBooking } from './myBooking';

test('round-trips and survives garbage', () => {
  expect(loadMyBooking()).toBeNull();
  saveMyBooking({ bookingId: 'bk-1', startISO: '2026-07-14T09:00:00Z', destName: 'Bali — Uluwatu' });
  expect(loadMyBooking()?.bookingId).toBe('bk-1');
  localStorage.setItem('birdie-breaks.myBooking.v1', '{not json');
  expect(loadMyBooking()).toBeNull();
});
```

```ts
// impl
export interface MyBooking { bookingId: string; startISO: string; destName?: string }
const KEY = 'birdie-breaks.myBooking.v1';

export function saveMyBooking(b: MyBooking): void {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode: booking still exists in dashboard */ }
}

export function loadMyBooking(): MyBooking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    return typeof b?.bookingId === 'string' && typeof b?.startISO === 'string' ? b : null;
  } catch { return null; }
}
```

- [ ] **Step 7: Run `npm test` → PASS. Commit**

```bash
git add src/bookings package.json package-lock.json
git commit -m "feat: wix bookings integration (client seam, availability mapping, booking api, local booking)"
```

---

### Task 12: Booking calendar + confirmation + fallback view

**Files:**
- Create: `src/ui/BookingCalendar.tsx`, `src/ui/ConfirmedCard.tsx`, `src/ui/FallbackView.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/BookingCalendar.test.tsx`

**Interfaces:**
- Consumes: `api.ts` (mocked directly in component tests), `useGame`, `destinationById`, `formatTime`, `saveMyBooking`/`loadMyBooking`.
- Produces: `<BookingCalendar />` — renders in `booking`; loads next-30-days availability; day grid → slot chips → name/email → **"Confirm booking"**; on success `saveMyBooking` + send `BOOKED`. `<ConfirmedCard />` — renders in `confirmed`. `<FallbackView />` — no-WebGL page: destination list + calendar (always open) + contact.
- **Nalu error copy (exact strings):** load failure `"Choppy connection! I couldn't fetch the calendar — try again?"` · zero slots `"No open waves in the next month — message the agent instead: "` + `AGENCY.email` · conflict `"Someone just caught that one — pick another!"`

- [ ] **Step 1: Write failing test `src/ui/BookingCalendar.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const getService = vi.fn();
const getAvailability = vi.fn();
const createBooking = vi.fn();
vi.mock('../bookings/api', async (orig) => ({
  ...(await orig() as object),
  getService: (...a: unknown[]) => getService(...a),
  getAvailability: (...a: unknown[]) => getAvailability(...a),
  createBooking: (...a: unknown[]) => createBooking(...a),
}));

import { BookingCalendar } from './BookingCalendar';
import { SlotConflictError } from '../bookings/api';
import { useGame } from '../game/store';

const DAY = { dateISO: '2026-07-14', slots: [{ startISO: '2026-07-14T09:00:00Z', endISO: '2026-07-14T09:30:00Z' }] };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useGame.getState().reset();
  useGame.setState({ state: 'booking', activeDestId: 'bali', bookingReturnTo: 'landed' });
  getService.mockResolvedValue({ id: 'svc-1', name: 'x' });
});

test('happy path: pick day, slot, details, confirm → BOOKED + saved locally', async () => {
  const user = userEvent.setup();
  getAvailability.mockResolvedValue([DAY]);
  createBooking.mockResolvedValue({ bookingId: 'bk-1' });
  render(<BookingCalendar />);
  await user.click(await screen.findByRole('button', { name: '14' }));
  await user.click(screen.getByRole('button', { name: /09:00/ }));
  await user.type(screen.getByLabelText(/name/i), 'Kai');
  await user.type(screen.getByLabelText(/email/i), 'kai@surf.com');
  await user.click(screen.getByRole('button', { name: 'Confirm booking' }));
  await waitFor(() => expect(useGame.getState().state).toBe('confirmed'));
  expect(JSON.parse(localStorage.getItem('birdie-breaks.myBooking.v1')!).bookingId).toBe('bk-1');
});

test('load failure shows Nalu error with retry', async () => {
  getAvailability.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([DAY]);
  render(<BookingCalendar />);
  expect(await screen.findByText(/Choppy connection!/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByRole('button', { name: '14' })).toBeInTheDocument();
});

test('conflict re-queries and asks to pick another', async () => {
  const user = userEvent.setup();
  getAvailability.mockResolvedValue([DAY]);
  createBooking.mockRejectedValue(new SlotConflictError('taken'));
  render(<BookingCalendar />);
  await user.click(await screen.findByRole('button', { name: '14' }));
  await user.click(screen.getByRole('button', { name: /09:00/ }));
  await user.type(screen.getByLabelText(/name/i), 'Kai');
  await user.type(screen.getByLabelText(/email/i), 'kai@surf.com');
  await user.click(screen.getByRole('button', { name: 'Confirm booking' }));
  expect(await screen.findByText(/Someone just caught that one/)).toBeInTheDocument();
  expect(getAvailability).toHaveBeenCalledTimes(2);
});

test('zero availability points at the agent', async () => {
  getAvailability.mockResolvedValue([]);
  render(<BookingCalendar />);
  expect(await screen.findByText(/No open waves/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/ui/BookingCalendar.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { destinationById } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { getService, getAvailability, createBooking, SlotConflictError } from '../bookings/api';
import { formatTime, type DaySlots, type Slot } from '../bookings/mapping';
import { saveMyBooking } from '../bookings/myBooking';

type Phase = 'loading' | 'error' | 'empty' | 'ready' | 'submitting';
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function BookingCalendar() {
  const send = useGame((g) => g.send);
  const returnTo = useGame((g) => g.bookingReturnTo);
  const destId = useGame((g) => g.activeDestId);
  const dest = destId ? destinationById(destId) : undefined;

  const [phase, setPhase] = useState<Phase>('loading');
  const [days, setDays] = useState<DaySlots[]>([]);
  const [dayISO, setDayISO] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase('loading');
    setNotice(null);
    try {
      const svc = await getService();
      const from = new Date();
      const to = new Date(from.getTime() + 30 * 24 * 3600 * 1000);
      const result = await getAvailability(svc.id, from.toISOString(), to.toISOString(), TZ);
      setDays(result);
      setPhase(result.length ? 'ready' : 'empty');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!slot || !name.trim() || !/.+@.+\..+/.test(email)) {
      setNotice('I need your name and a real email to book you in!');
      return;
    }
    setPhase('submitting');
    try {
      const { bookingId } = await createBooking(slot, { name: name.trim(), email: email.trim() });
      saveMyBooking({ bookingId, startISO: slot.startISO, destName: dest?.name });
      send({ type: 'BOOKED' });
    } catch (e) {
      if (e instanceof SlotConflictError) {
        setNotice('Someone just caught that one — pick another!');
        setSlot(null);
        await load();
      } else {
        setPhase('ready');
        setNotice("Choppy connection! I couldn't fetch the calendar — try again?");
      }
    }
  };

  const selectedDay = days.find((d) => d.dateISO === dayISO) ?? null;

  return (
    <div className="bb-card bb-modal" role="dialog" aria-modal="true" aria-label="Book with your surf agent">
      <span className="bb-caption" style={{ color: 'var(--coral-deep)' }}>NALU: “Let's find a time!”</span>
      <h2>Book with your surf agent</h2>
      <p className="bb-caption">
        Trip-planning session · 30 min · online video call{dest ? ` · about ${dest.name}` : ''}
      </p>

      {phase === 'loading' && <p>Checking the agent's calendar…</p>}

      {phase === 'error' && (
        <p className="bb-error" role="alert">
          Choppy connection! I couldn't fetch the calendar — try again?{' '}
          <button className="bb-btn bb-btn--sun" onClick={() => void load()}>Try again</button>
        </p>
      )}

      {phase === 'empty' && (
        <p role="alert">No open waves in the next month — message the agent instead:{' '}
          <a href={`mailto:${AGENCY.email}`}>{AGENCY.email}</a>
        </p>
      )}

      {(phase === 'ready' || phase === 'submitting') && (
        <div className="bb-cols">
          <div>
            <div className="bb-grid" role="group" aria-label="Days with availability">
              {days.map((d) => (
                <button key={d.dateISO} className="bb-day bb-day--has"
                  aria-pressed={d.dateISO === dayISO}
                  onClick={() => { setDayISO(d.dateISO); setSlot(null); }}>
                  {Number(d.dateISO.slice(-2))}
                </button>
              ))}
            </div>
          </div>
          <div>
            {selectedDay && (
              <div role="group" aria-label="Open times">
                {selectedDay.slots.map((s) => (
                  <button key={s.startISO} className="bb-slot"
                    aria-pressed={slot?.startISO === s.startISO}
                    onClick={() => setSlot(s)}>
                    {formatTime(s.startISO, TZ)}
                  </button>
                ))}
              </div>
            )}
            <label>Your name
              <input className="bb-field" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>Email
              <input className="bb-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {notice && <p className="bb-error" role="alert">{notice}</p>}
            <button className="bb-btn" disabled={phase === 'submitting' || !slot} onClick={() => void submit()}>
              Confirm booking
            </button>
          </div>
        </div>
      )}

      <p className="bb-caption">Real availability via Wix Bookings · Esc to close</p>
      <button className="bb-btn bb-btn--sun"
        onClick={() => send({ type: 'CLOSE_BOOKING', returnTo })}>Close</button>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/ui/ConfirmedCard.tsx`**

```tsx
import { useGame } from '../game/store';
import { loadMyBooking } from '../bookings/myBooking';
import { formatTime } from '../bookings/mapping';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function ConfirmedCard() {
  const send = useGame((g) => g.send);
  const b = loadMyBooking();
  return (
    <div className="bb-card bb-center" role="dialog" aria-label="Booking confirmed">
      <div className="bb-stamp">🤙</div>
      <h2>You're booked!</h2>
      {b && (
        <p>
          <b>{new Date(b.startISO).toDateString()} · {formatTime(b.startISO, TZ)}</b>
          <br />30 min video call with your surf agent{b.destName ? ` — about ${b.destName}` : ''}
        </p>
      )}
      <p className="bb-caption">Saved under “My booking” in the menu · the agent sees it in their dashboard</p>
      <button className="bb-btn bb-btn--sun" onClick={() => send({ type: 'DONE' })}>Back to the skies</button>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/ui/FallbackView.tsx`** (no-WebGL path — business function without 3D)

```tsx
import { DESTINATIONS } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { BookingCalendar } from './BookingCalendar';
import { useGame } from '../game/store';
import { useEffect } from 'react';

export function FallbackView() {
  const send = useGame((g) => g.send);
  useEffect(() => {
    useGame.setState({ state: 'booking', bookingReturnTo: 'flying' });
  }, [send]);

  return (
    <div className="bb-fallback">
      <h1>Birdie Breaks 🐦</h1>
      <p>Your browser can't fly the 3D globe, but the surf trips are all still here.</p>
      {DESTINATIONS.map((d) => (
        <section key={d.id} className="bb-card" style={{ margin: '12px 0' }}>
          <h2>{d.name} {d.emoji}</h2>
          <p>{d.bestWindow.months} · {d.bestWindow.windNotes} · {d.bestWindow.tideNotes}</p>
          <ul>{d.spots.map((s) => <li key={s.name}><b>{s.name}</b> — {s.note}</li>)}</ul>
          <p className="bb-caption">Skill: {d.skillLevel} · Water: {d.waterTemp}</p>
        </section>
      ))}
      <BookingCalendar />
      <p className="bb-caption">Questions? {AGENCY.email} · {AGENCY.phone}</p>
    </div>
  );
}
```

- [ ] **Step 5: Mount in `App.tsx`:** `{state === 'booking' && <BookingCalendar />}`, `{state === 'confirmed' && <ConfirmedCard />}` in the overlay; render `<FallbackView />` in the no-WebGL branch. Run `npm test` → PASS.

- [ ] **Step 6: Manual verification against the real service** — `npm run dev`, land at a pin → CTA → real slots appear (agent hours from the dashboard); book one with your own email; confirm the appointment shows in the site dashboard under Bookings. **Delete the test appointment afterwards.**

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: booking calendar with real availability, confirmation card, no-WebGL fallback"
```

---

### Task 13: Side navigation

**Files:**
- Create: `src/ui/SideNav.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/SideNav.test.tsx`

**Interfaces:**
- Consumes: `useGame` (`flyTo`, `send`), `DESTINATIONS`, `AGENCY`, `loadMyBooking`, `formatTime`.
- Produces: `<SideNav />` — always-rendered edge tab (`MENU ☰`); drawer with: destinations quick-jump (`flyTo(id)` + close), About, My booking (saved booking summary, else "Book a session" → `OPEN_BOOKING`), contact. Esc / scrim click closes. Drawer open state is local `useState`, not the game machine.

- [ ] **Step 1: Write failing test `src/ui/SideNav.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideNav } from './SideNav';
import { useGame } from '../game/store';

beforeEach(() => {
  localStorage.clear();
  useGame.getState().reset();
  useGame.setState({ state: 'flying' });
});

test('quick-jump flies Nalu to the destination and closes', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  await user.click(screen.getByRole('button', { name: /Jeffreys Bay/ }));
  expect(useGame.getState().activeDestId).toBe('jbay');
  expect(useGame.getState().state).toBe('approaching');
  expect(screen.queryByText(/THE AGENCY/)).not.toBeInTheDocument();
});

test('my booking: empty state opens the calendar directly', async () => {
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  await user.click(screen.getByRole('button', { name: /book a session/i }));
  expect(useGame.getState().state).toBe('booking');
});

test('my booking: shows the saved booking', async () => {
  localStorage.setItem('birdie-breaks.myBooking.v1',
    JSON.stringify({ bookingId: 'bk-1', startISO: '2026-07-14T09:00:00Z', destName: 'Bali — Uluwatu' }));
  const user = userEvent.setup();
  render(<SideNav />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  expect(screen.getByText(/Bali — Uluwatu/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/ui/SideNav.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { DESTINATIONS } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { loadMyBooking } from '../bookings/myBooking';
import { formatTime } from '../bookings/mapping';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function SideNav() {
  const [open, setOpen] = useState(false);
  const flyTo = useGame((g) => g.flyTo);
  const send = useGame((g) => g.send);
  const booking = open ? loadMyBooking() : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className="bb-navtab" onClick={() => setOpen(true)} aria-expanded={open}>MENU ☰</button>
      {open && (
        <>
          <button className="bb-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
          <nav className="bb-card bb-drawer" aria-label="Site menu">
            <b style={{ fontSize: 18 }}>🐦 BIRDIE BREAKS</b>
            <span className="sect">DESTINATIONS — pick one and I'll fly us there</span>
            {DESTINATIONS.map((d) => (
              <button key={d.id} className="link" onClick={() => { flyTo(d.id); setOpen(false); }}>
                {d.emoji} {d.name}
              </button>
            ))}
            <span className="sect">THE AGENCY</span>
            <p style={{ margin: '4px 8px', fontSize: 14, lineHeight: 1.5 }}>{AGENCY.about}</p>
            <span className="sect">MY BOOKING</span>
            {booking ? (
              <p style={{ margin: '4px 8px', fontSize: 14 }}>
                🤙 {new Date(booking.startISO).toDateString()} · {formatTime(booking.startISO, TZ)}
                {booking.destName ? <><br />about {booking.destName}</> : null}
              </p>
            ) : (
              <button className="link" onClick={() => { send({ type: 'OPEN_BOOKING' }); setOpen(false); }}>
                📅 Book a session with the agent
              </button>
            )}
            <p className="bb-caption" style={{ marginTop: 'auto', padding: '0 8px' }}>
              {AGENCY.email}<br />{AGENCY.phone}
            </p>
          </nav>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 3: Mount `<SideNav />` in `App.tsx`** — outside the state switch (always rendered, including intro). Run `npm test` → PASS; manual check in `npm run dev`. Commit

```bash
git add -A && git commit -m "feat: side navigation with quick-jump, about, and my booking"
```

---

### Task 14: Touch controls + final a11y/perf pass

**Files:**
- Create: `src/ui/TouchControls.tsx`
- Modify: `src/App.tsx`, `src/hooks/useKeyboardControls.ts` (extract shared input ref if needed)
- Test: `src/ui/TouchControls.test.tsx`

**Interfaces:**
- Consumes: `useGame`.
- Produces: `<TouchControls onInput={(input: FlightInput) => void} />` — shown only on coarse pointers (`matchMedia('(pointer: coarse)')`); d-pad `pointerdown/up/leave` produce input; LAND button disabled unless `approaching`, sends `LAND`. `App.tsx` combines keyboard input and touch input: `getInput()` returns the keyboard vector unless the touch vector is non-zero.

- [ ] **Step 1: Write failing test `src/ui/TouchControls.test.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TouchControls } from './TouchControls';
import { useGame } from '../game/store';

beforeEach(() => useGame.getState().reset());

test('d-pad presses produce input vectors', () => {
  const onInput = vi.fn();
  render(<TouchControls onInput={onInput} forceVisible />);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'fly right' }));
  expect(onInput).toHaveBeenLastCalledWith({ dx: 1, dy: 0 });
  fireEvent.pointerUp(screen.getByRole('button', { name: 'fly right' }));
  expect(onInput).toHaveBeenLastCalledWith({ dx: 0, dy: 0 });
});

test('LAND only works while approaching', () => {
  render(<TouchControls onInput={() => {}} forceVisible />);
  const land = screen.getByRole('button', { name: 'LAND' });
  expect(land).toBeDisabled();
  useGame.setState({ state: 'approaching', activeDestId: 'oahu' });
  expect(screen.getByRole('button', { name: 'LAND' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'LAND' }));
  expect(useGame.getState().state).toBe('landed');
});
```

- [ ] **Step 2: Run `npm test` → FAIL. Implement `src/ui/TouchControls.tsx`**

```tsx
import { useRef, useSyncExternalStore } from 'react';
import { useGame } from '../game/store';
import type { FlightInput } from '../game/flight';

function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (cb) => { const mq = window.matchMedia('(pointer: coarse)'); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false,
  );
}

interface Props { onInput: (input: FlightInput) => void; forceVisible?: boolean }

export function TouchControls({ onInput, forceVisible = false }: Props) {
  const state = useGame((g) => g.state);
  const send = useGame((g) => g.send);
  const coarse = useCoarsePointer();
  const held = useRef<FlightInput>({ dx: 0, dy: 0 });

  if (!coarse && !forceVisible) return null;
  if (state === 'intro' || state === 'booking' || state === 'confirmed') return null;

  const press = (dx: -1 | 0 | 1, dy: -1 | 0 | 1) => () => { held.current = { dx, dy }; onInput(held.current); };
  const release = () => { held.current = { dx: 0, dy: 0 }; onInput(held.current); };

  const dirs: { label: string; dx: -1 | 0 | 1; dy: -1 | 0 | 1; area: string; glyph: string }[] = [
    { label: 'fly up', dx: 0, dy: 1, area: '1 / 2', glyph: '▲' },
    { label: 'fly left', dx: -1, dy: 0, area: '2 / 1', glyph: '◀' },
    { label: 'fly right', dx: 1, dy: 0, area: '2 / 3', glyph: '▶' },
    { label: 'fly down', dx: 0, dy: -1, area: '3 / 2', glyph: '▼' },
  ];

  return (
    <>
      <div className="bb-dpad" role="group" aria-label="Flight controls">
        {dirs.map((d) => (
          <button key={d.label} aria-label={d.label} style={{ gridArea: d.area }}
            onPointerDown={press(d.dx, d.dy)} onPointerUp={release} onPointerLeave={release}>
            {d.glyph}
          </button>
        ))}
      </div>
      <button className="bb-land" disabled={state !== 'approaching'}
        onClick={() => send({ type: 'LAND' })}>
        LAND
      </button>
    </>
  );
}
```

- [ ] **Step 3: Combine inputs in `App.tsx`**

```tsx
const touchInput = useRef<FlightInput>({ dx: 0, dy: 0 });
const combinedInput = () => {
  const t = touchInput.current;
  return t.dx !== 0 || t.dy !== 0 ? t : getInput();
};
// pass combinedInput to <GlobeScene getInput={combinedInput} …>
// render <TouchControls onInput={(i) => { touchInput.current = i; }} />
```

- [ ] **Step 4: A11y/perf checklist** (verify, fix if broken — all should already hold):
  - `npm run dev` with OS reduced-motion ON → no bob, no cloud drift, instant dialogue.
  - Chrome DevTools device toolbar (touch) → d-pad + LAND appear; keyboard chip logic unaffected.
  - Background the tab 30 s → no console errors, animation resumes on return (Rig skips when `document.hidden`).
  - Tab through: navtab → bubble/cards → calendar fields all focusable in order.

- [ ] **Step 5: Run `npm test` → PASS. Commit**

```bash
git add -A && git commit -m "feat: touch controls and accessibility/perf pass"
```

---

### Task 15: Full verification + deploy

**Files:**
- Modify: `README.md` (dev/deploy/live URL), `docs/scaffold-notes.md` (final LIVE_URL)

- [ ] **Step 1: Full test suite** — `npm test` → all green. `npm run build` (BUILD_CMD) → succeeds.

- [ ] **Step 2: Manual E2E on `npm run dev`** (the whole spec journey):
  1. Reload → intro: 3 bubbles, typewriter, "Let's fly!".
  2. Fly all directions; cross the antimeridian (no snap-back); poles clamp.
  3. Approach Oahu → pin glows + toast; Space → land; info card facts match `destinations.ts`.
  4. CTA → calendar with real slots; book with your own email → confirmed card 🤙.
  5. Menu → My booking shows it; quick-jump to J-Bay → approaching there; About renders.
  6. Esc everywhere behaves (close booking → back where you came from).
  7. Wix dashboard → Bookings → appointment exists. **Delete the test appointment.**
- [ ] **Step 3: Deploy** with `DEPLOY_CMD` from `docs/scaffold-notes.md`; repeat one booking flow on the live URL (and delete the test appointment from the dashboard).

- [ ] **Step 4: Update `README.md`** with dev commands (`fnm use 20` reminder!), live URL, and a pointer to this plan + the spec. Final commit:

```bash
git add -A && git commit -m "docs: readme with dev workflow and live site"
```

- [ ] **Step 5: Report** — live URL, dashboard link, anything deferred.

---

### Task 16: SEO pass (added 2026-07-10 — the site competes in a contest where SEO is scored)

**Files:**
- Create: `src/seo/jsonld.ts`, `src/seo/jsonld.test.ts`, `public/robots.txt`, `public/sitemap.xml`, `public/og-image.png`
- Modify: `src/pages/index.astro`, `src/layouts/Layout.astro`

**Interfaces:**
- Consumes: `DESTINATIONS` (Task 3), `AGENCY` (Task 3), `SERVICE_NAME` (Task 11), live URL from `docs/scaffold-notes.md`.
- Produces: `buildJsonLd(): object` — schema.org graph: `TravelAgency` (name Birdie Breaks, email/phone from AGENCY) + `Service` (SERVICE_NAME, 30 min, online) + `ItemList` of 6 `TouristDestination` entries (name, description from bestWindow/spots).

- [ ] **Step 1 (TDD): `src/seo/jsonld.test.ts`** — asserts: graph contains a TravelAgency named "Birdie Breaks"; a Service named exactly `SERVICE_NAME`; exactly 6 TouristDestination items; every destination name present; no `undefined` serialized. RED → implement `src/seo/jsonld.ts` (pure, imports data modules) → GREEN.
- [ ] **Step 2: `Layout.astro` head** — first inspect what the scaffold's `wix-seo-tag` already injects (view the dev-server HTML) and do NOT duplicate it. Add whatever is missing of: `<html lang="en">`, meta description (~155 chars: fly Nalu the nene around a toy globe, discover six world-class surf trips, book a real planning session), canonical (live URL), OpenGraph (og:title/description/type website/url/image) + `twitter:card summary_large_image`. Favicon: keep scaffold's or add a bird emoji SVG favicon.
- [ ] **Step 3: server-rendered crawlable content in `index.astro`** — beneath the `<App client:only="react" />` island, render semantic static HTML from the same data modules (import `DESTINATIONS`/`AGENCY` in frontmatter): `<h1>` with brand + value proposition, intro paragraph, one `<section>` per destination (name, country, best window, wind/tide notes, spots, skill, water temp), booking CTA text, contact. This content is real (same substance the game presents) — progressive enhancement, not cloaking; it also serves screen readers and no-JS visitors. The game canvas/overlays render above it; body overflow stays hidden.
- [ ] **Step 4: JSON-LD** — serialize `buildJsonLd()` into `<script type="application/ld+json">` in `index.astro`.
- [ ] **Step 5: `public/robots.txt`** (allow all + sitemap pointer) and `public/sitemap.xml` (single URL entry, the live URL). `public/og-image.png`: copy the best existing game screenshot (`.superpowers/sdd/task-8-intro.png`).
- [ ] **Step 6: verify** — `npm run build` succeeds; built/dev HTML contains the h1, destination sections, JSON-LD, meta description, OG tags (curl + grep); full `npm test` green.
- [ ] **Step 7: commit** — `feat: seo pass — crawlable content, structured data, social cards`

---

## Self-Review (performed at planning time)

- **Spec coverage:** intro/flight/landing/info/booking/confirmed → Tasks 5–12; side nav (3 chosen sections) → Task 13; desktop-first + basic touch → Tasks 6/14; WebGL fallback → Task 12; Nalu-voiced errors incl. conflict re-query → Task 12; reduced-motion/dpr/hidden-tab → Tasks 7/8/14; hardcoded destinations → Task 3; Bookings as only integration → Tasks 1/11; deploy-day-one → Task 1; names/palette/layout → Global Constraints. Sound/CMS/members/payments — out of scope, no tasks (correct).
- **Placeholder scan:** the only deliberately deferred values live in `docs/scaffold-notes.md` (framework facts unknowable before Task 1 runs) and connector-doc reconciliation in Task 11 Step 0 — both are explicit discovery steps with named outputs, not TBDs.
- **Type consistency:** `FlightInput` `{dx, dy}` used identically in Tasks 4/6/7/14; `GameEvent` names match machine/store/UI (`CLOSE_BOOKING` carries `returnTo`); `DaySlots`/`Slot` shapes match between mapping/api/calendar; localStorage key string identical in Tasks 11/12/13 tests; `LANDING_RANGE_DEG` defined once (Task 3), consumed by store (Task 5).


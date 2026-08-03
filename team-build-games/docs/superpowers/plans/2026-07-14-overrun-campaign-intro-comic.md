# Overrun Campaign — Increment 1: mode + synced intro comic

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a Campaign/Survival mode toggle to Overrun and play the 5-panel intro comic — synced to every player in the room — before a Campaign match starts.

**Architecture:** Mode is a lobby/island concern (React state), not sim/wire state — Survival and Campaign differ (for now) only in whether the host plays the intro comic before starting. Sync reuses the coin-insert pattern: a new `oIntro` broadcast flips an `introPlaying` flag on every peer's session; each client renders the already-built `OverrunComic` while the flag is set; the host advances to the real `start()` when the comic finishes, and the existing `oStart` → `beginMatch` clears the flag on everyone.

**Tech Stack:** TypeScript, React island, `@wix/*` P2P transport, vitest, Phaser (renderer untouched here).

## Global Constraints
- Overrun wire tags all start with `"o"` (disjoint from lobby traffic); `decode` accepts any `o*` tag.
- Enum/union additions are **append-only**; never renumber existing tags.
- `OverrunComic` already exists at `src/components/game/overrun/OverrunComic.tsx` (`onDone` callback, ~10s, Skip). Do not rebuild it.
- This increment adds **no** sim/world/codec fields (mode-driven stages/bosses are later increments per the spec §11).

**Spec:** `docs/superpowers/specs/2026-07-13-overrun-campaign-design.md` (§2 modes, §3.5 intro comic, §8.5 sync note).

---

### Task 1: `oIntro` wire message

**Files:**
- Modify: `src/game/overrun/net/protocol.ts:15-20`
- Test: `src/game/overrun/net/protocol.test.ts`

**Interfaces:**
- Produces: `OverrunNetMessage` union gains `{ t: "oIntro" }`.

- [ ] **Step 1: Write the failing test** (append to `protocol.test.ts`)

```ts
it("round-trips the oIntro campaign-intro signal", () => {
  expect(decode(encode({ t: "oIntro" }))).toEqual({ t: "oIntro" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project overrun src/game/overrun/net/protocol.test.ts`
Expected: FAIL (type error / union has no `oIntro`).

- [ ] **Step 3: Add the message to the union**

In `protocol.ts`, add to `OverrunNetMessage`:
```ts
  | { t: "oIntro" }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project overrun src/game/overrun/net/protocol.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/net/protocol.ts src/game/overrun/net/protocol.test.ts
git commit -m "feat(overrun): add oIntro wire message for campaign intro sync"
```

---

### Task 2: Session `introPlaying` + `signalIntro()`

**Files:**
- Modify: `src/game/overrun/net/session.ts` (field, `getState`, new method, `onMessage`, `beginMatch`, `toLobby`)
- Test: `src/game/overrun/net/session.test.ts`

**Interfaces:**
- Consumes: `OverrunNetMessage.oIntro` (Task 1), existing `encode`/`decodeLobby` split in `onMessage`.
- Produces:
  - `OverrunSession.introPlaying: boolean`
  - `OverrunSession.signalIntro(): void` — host-only; broadcasts `oIntro`, sets `introPlaying = true`, fires `onChange`.
  - `getState().introPlaying: boolean`

- [ ] **Step 1: Write the failing tests** (append to `session.test.ts`)

```ts
describe("OverrunSession campaign intro", () => {
  it("host signalIntro flips introPlaying on every peer", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.signalIntro();
    expect(sessions.every((s) => s.getState().introPlaying)).toBe(true);
  });

  it("non-host signalIntro is a no-op", () => {
    const { sessions } = makeParty(2);
    sessions[1]!.signalIntro();
    expect(sessions.some((s) => s.getState().introPlaying)).toBe(false);
  });

  it("starting the match clears introPlaying everywhere", () => {
    const { sessions } = makeParty(2);
    sessions[0]!.signalIntro();
    sessions[0]!.start();
    expect(sessions.every((s) => s.getState().introPlaying)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --project overrun src/game/overrun/net/session.test.ts -t "campaign intro"`
Expected: FAIL (`signalIntro`/`introPlaying` undefined).

- [ ] **Step 3: Implement in `session.ts`**

Add the field near `phase`/`matchEpoch`:
```ts
  /** True from campaign intro broadcast until the match begins — drives the synced intro comic. */
  introPlaying = false;
```
Add to the `getState()` return object:
```ts
      introPlaying: this.introPlaying,
```
Add the method (near `start()`):
```ts
  /** Host-only: tell every peer to play the campaign intro comic before the match starts. */
  signalIntro(): void {
    if (this.hostId() !== this.localId || this.introPlaying) return;
    this.t.send(encode({ t: "oIntro" }));
    this.introPlaying = true;
    this.opts.onChange();
  }
```
In `onMessage`, inside the Overrun-tag `switch (om.t)` block, add a case:
```ts
        case "oIntro":
          this.introPlaying = true;
          this.opts.onChange();
          break;
```
In `beginMatch(...)`, at the top (so match start clears it on host + peers):
```ts
    this.introPlaying = false;
```
In `toLobby()`, alongside the other resets:
```ts
    this.introPlaying = false;
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --project overrun src/game/overrun/net/session.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/net/session.ts src/game/overrun/net/session.test.ts
git commit -m "feat(overrun): synced introPlaying flag + host signalIntro()"
```

---

### Task 3: Lobby mode toggle + island intro-comic wiring

Integration (React island + Phaser overlay) — verified in the browser, not unit tests.

**Files:**
- Modify: `src/components/game/overrun/OverrunWarmupRoom.tsx` (mode toggle; `onStart` gains a mode arg)
- Modify: `src/components/game/overrun/Overrun.tsx` (mode state, campaign start → `signalIntro`, render `OverrunComic` while `introPlaying`, host `onDone` → `start`)

**Interfaces:**
- Consumes: `session.signalIntro()`, `session.getState().introPlaying` (Task 2); `OverrunComic` (`onDone`); `COIN_INSERT_MS`.
- Produces: `OverrunWarmupRoom` prop `onStart: (mode: "campaign" | "survival") => void`.

- [ ] **Step 1: Mode toggle in `OverrunWarmupRoom.tsx`**

Add to `Props`: `mode: "campaign" | "survival"; onMode: (m: "campaign" | "survival") => void;` and change `onStart` to `onStart: (mode: "campaign" | "survival") => void`.
Above the `CoinSlot`, render a host-only toggle (mirrors Arena's mode buttons):
```tsx
{props.isHost && (
  <div className="mb-3 flex gap-2" role="group" aria-label="Game mode">
    {(["campaign", "survival"] as const).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => props.onMode(m)}
        aria-pressed={props.mode === m}
        className={`rounded-md border px-3 py-2 font-display text-[9px] uppercase transition ${
          props.mode === m ? "border-red-400/70 bg-red-500/10 text-red-300" : "border-white/15 text-neutral-400 hover:border-white/40"
        }`}
      >
        {m === "campaign" ? "Campaign" : "Survival"}
      </button>
    ))}
  </div>
)}
```
Change the CoinSlot `onInsert` to `() => props.onStart(props.mode)`.

- [ ] **Step 2: Island state + wiring in `Overrun.tsx`**

Add near the other state: `const [mode, setMode] = useState<"campaign" | "survival">("campaign");`
Import the comic: `import OverrunComic from "./OverrunComic";`
Replace `startMatch` so campaign plays the synced intro, survival is unchanged:
```tsx
const startMatch = (selectedMode: "campaign" | "survival" = "survival") => {
  sfxRef.current.resume();
  musicRef.current?.unlock();
  samplesRef.current?.unlock();
  const session = sessionRef.current;
  if (!session) return;
  if (selectedMode === "campaign") {
    session.signalIntro(); // all peers show the comic
    // host advances to the real start when the comic finishes (see onIntroDone)
  } else {
    session.signalCoin();
    window.setTimeout(() => session.start(), COIN_INSERT_MS);
  }
};
const onIntroDone = () => {
  const session = sessionRef.current;
  if (session && session.getState().isHost) session.start();
};
```
Pass `mode`, `onMode={setMode}`, and `onStart={startMatch}` to `<OverrunWarmupRoom>`.
Render the comic overlay whenever the session says the intro is playing (before the match view). Near the top of the returned JSX, when `sessionState?.introPlaying && !inMatch`:
```tsx
{sessionState?.introPlaying && !inMatch ? (
  <div className="w-full">
    <OverrunComic onDone={onIntroDone} />
    {!sessionState.isHost && (
      <p className="mt-3 text-center font-display text-[9px] text-neutral-500">
        The host is starting the mission…
      </p>
    )}
  </div>
) : !inMatch ? (
  <OverrunWarmupRoom ... />
) : (
  /* existing match view */
)}
```
(Only the host's `onDone` calls `start()`; a non-host `onDone`/Skip just ends their local comic and they wait for the host's `oStart`, which `beginMatch` turns into the live match.)

- [ ] **Step 3: Type-check**

Run: `npx astro check`
Expected: no new errors in `Overrun.tsx` / `OverrunWarmupRoom.tsx` (pre-existing unrelated errors may remain).

- [ ] **Step 4: Browser verification** (`npm run dev`)

1. Open `/games/overrun` in two browser contexts sharing the room link (host + peer).
2. Host: Campaign selected → click START. **Expected:** both host and peer show the 5-panel comic; after it finishes (or host Skip), both transition into the wave-defense match.
3. Back to lobby; switch to Survival → START. **Expected:** coin insert only, no comic, match starts (unchanged behavior).
4. Confirm no new console errors beyond the known `frog.wix.com` beacon.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/overrun/Overrun.tsx src/components/game/overrun/OverrunWarmupRoom.tsx
git commit -m "feat(overrun): Campaign/Survival toggle + synced intro comic before campaign matches"
```

---

## Follow-on increments (separate plans, from spec §11)
2. Data + stages (`stages.ts`, swarmling + boss defs). 3. Campaign wave engine. 4. Sim (stage bookkeeping, stage-intro hold, boss specials — traveling quake + 0.5s leap, victory). 5. Per-member progress (`OverrunProgress` + `/api/overrun-progress`). 6. Stage picker fed by progress. 7. Renderer/HUD (boss bar, 1s inter-stage interstitial, victory/outro). 8. Playtest tuning.

## Self-review
- **Spec coverage (this increment):** §2 mode toggle ✓ (Task 3); §3.5 intro comic played on campaign start ✓ (Tasks 2–3); §8.5 sync via broadcast+flag ✓ (Tasks 1–2). Stages/bosses/progress/renderer intentionally deferred to follow-on plans.
- **Placeholders:** none — all steps carry concrete code/commands.
- **Type consistency:** `signalIntro()` / `introPlaying` / `onStart(mode)` used identically across Tasks 2–3; `OverrunComic.onDone` matches the built component.

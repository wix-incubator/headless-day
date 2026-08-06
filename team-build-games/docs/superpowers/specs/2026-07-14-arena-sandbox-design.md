# Arena Sandbox (test harness) — design

- **Date:** 2026-07-14
- **Status:** approved (pending spec review)
- **Scope:** Arena only (pattern for Overrun / Road Madness later)

## Goal

A developer sandbox for Arena: skip the lobby, waves, and win-condition, and drop the player plus a
**chosen target** into an empty field with autonomous behavior frozen — so mechanics can be inspected
in isolation (hit feedback, hit-stun, knockback, capsule hit-detection, per-kind sprites, weapon
swing/arc, animations, spawn placement). Everything is configured from the URL query, so a specific
test state is a shareable link.

The sandbox drives the **real production code paths** (same `stepWorld` → `stepSurvival` / versus
combat, same renderer), so what you inspect is what ships — it is not a separate mock.

## Activation & gating

- Active only when `?sandbox` is present in the URL **and** `import.meta.env.DEV` is true. The whole
  branch is dead-code-eliminated from the production bundle — no player-facing surface, ever.
- When active, the Arena island bypasses the warm-up room / session entirely and mounts the game
  scene against a local, zero-netcode `SandboxDriver`.

## Query schema

| Param | Values | Default | Effect |
|---|---|---|---|
| `sandbox` | presence | — | activates the sandbox |
| `enemy` | `crawler,ant,zombie,bat,dino,clawed,dummy` (comma-separated for several) | `crawler` | target kind(s); `dummy` = a player-shaped versus target |
| `count` | integer ≥ 1 | `1` | number of targets (round-robins over the listed kinds) |
| `ai` | `off` \| `on` \| `toggle` | `off` | `off` = frozen · `on` = active (enemies chase+bite / dummy fought by bot AI) · `toggle` = starts frozen, a keybind flips it live |
| `weapon` | `sword,spear,knife,bow,katana,solar-hammer` | `sword` | player weapon (warm-up is skipped) |
| `hp` | integer ≥ 1 | kind default (dummy: high) | override target health (test multi-hit / knockback) |
| `dist` | metres | `4` | spawn distance ahead of the player |

Example: `/games/arena?sandbox&enemy=dino&ai=toggle&weapon=katana&hp=20`

## Two target sub-modes (both real paths)

- **Survival enemies** (`enemy=<kind>`): a survival `World` (`world.survival` set) with the target
  kinds pre-placed and sandbox flags on. `stepWorld` already routes survival worlds through
  `stepSurvival`, so player↔enemy combat, hit-stun, knockback, and the capsule hit-test all run
  through their production paths.
- **Versus dummy** (`enemy=dummy`): a normal versus `World` with the local player + frozen
  player-shaped target(s). `stepWorld`'s versus path resolves player↔player attacks (blocking,
  knockback, health) against them. `ai=on` drives the dummy with the existing `botIntent` so it
  spars back.

## Sim changes (isolated, additive, unit-tested)

Sandbox behavior is expressed as flags so the reducers stay pure and reusable:

- **No waves / no progression / no auto-end:** a sandbox flag makes `stepSurvival` skip wave spawning
  and the wave-clear/wipe machine, and makes the versus path skip the sole-survivor win-condition, so
  the world never auto-ends.
- **Freeze:** a `frozen` option makes `stepEnemies` skip chase + contact (targets stand still but
  still stagger + knock back when hit — exactly the feedback under test). `ai=on`/toggle clears it
  (enemies chase; the dummy receives `botIntent`).

Exact field placement (on `SurvivalState` vs `World`) is a plan detail; the contract is: sandbox worlds
never auto-end, never auto-spawn, and freeze non-player entities until AI is enabled.

## Driver & UI

- **`SandboxDriver`** — a zero-netcode local driver mirroring the existing `SoloDriver`: holds the
  sandbox `World`, steps `stepWorld` each frame with the player's intent (and `botIntent` for an
  active dummy), and exposes `respawn()`, `toggleAi()`, `setEnemy(kind)`, `setWeapon(w)`.
- **`SandboxControls`** — a small dev overlay: a readout of the current config + keybinds
  `R` respawn · `T` toggle AI (when `ai=toggle`) · `[` / `]` cycle enemy kind live · `1‑6` swap weapon.
- **Arena.tsx** — one minimal additive branch: if the sandbox is active, mount the scene with
  `SandboxDriver` + overlay instead of the lobby. (The only hot-file touch.)

## Pure helpers (new file `src/game/arena/sandbox.ts`)

- `parseSandboxConfig(params: URLSearchParams): SandboxConfig` — parse + clamp + default every param
  (unknown enemy/weapon → default; `count`/`hp`/`dist` clamped to sane ranges).
- `createSandboxWorld(config): World` — build the versus-or-survival world with targets placed
  `dist` metres ahead, sandbox flags set, player using `weapon`.

## Testing (TDD)

- `parseSandboxConfig`: defaults, clamping, multi-kind `enemy`, `dummy`, bad input.
- `createSandboxWorld`: correct world shape per sub-mode, target count/placement, flags set.
- Sim flags: a frozen enemy doesn't chase/bite but still staggers + is pushed on hit; no auto-spawn;
  a sandbox world never transitions to `ended` (survival or versus) even when only the player remains.

## Out of scope (for now)

- Overrun and Road Madness sandboxes (same pattern once Arena lands).
- Any persistence / recorded scenarios / production surface.
- A rich control panel (query params + a few keybinds are enough).

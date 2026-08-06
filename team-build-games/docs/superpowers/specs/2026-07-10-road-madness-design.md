# Road Madness — Product Requirements & Roadmap

**Date:** 2026-07-10

**Status:** working product definition; first vertical slice starts in this change

**Engine:** Phaser 4, matching the existing TeamBuild Games stack

## 1. Product promise

**Road Madness** is a 1–8 player browser party game about readable arcade driving, dramatic
collisions, and short rounds that create stories. A player opens a room, shares its URL, chooses a
mode and car, and is driving in under a minute. Every mode uses the same deterministic vehicle
simulation, lobby, netcode, controls, collision language, and procedural placeholder-art pipeline.

The game should feel closer to an arcade cabinet than a simulator:

- throttle, brake/reverse, steering, handbrake drift, and a short nitro boost;
- strong silhouettes, exaggerated suspension, sparks, skid marks, camera shake, and clear damage;
- forgiving steering at low speed and controllable slides at high speed;
- matches lasting roughly 2–6 minutes, with immediate rematch and room return;
- solo practice with bots, but multiplayer is the main product.

The first playable slice is **Last Madman Standing** against bots. Online rooms are the next
milestone, before the other three modes are widened.

## 2. Audience and session shape

- **Players:** 1–8; one local driver per browser in the first release.
- **Input:** keyboard first; gamepad follows. Touch is not an initial target.
- **Platform:** current desktop Chrome, Firefox, and Safari on an ordinary work laptop.
- **Session:** warm-up room → 3-second countdown → short match/rounds → results → rematch or room.
- **Identity:** anonymous nickname and car color; signed-in cosmetics may be added later.
- **Bots:** available for practice and to fill empty seats. Bots obey the same inputs and physics.

## 3. Shared driving and collision rules

### Controls

| Action | Keyboard | Rule |
|---|---|---|
| Accelerate | W / ↑ | Forward throttle |
| Brake / reverse | S / ↓ | Brakes while moving forward, then engages reverse |
| Steer | A/D or ←/→ | Steering authority scales with speed; reverses while backing up |
| Handbrake | Space | Reduces rear grip for a short, controllable drift |
| Nitro | Shift | Spends a small rechargeable meter; disabled where a mode needs normalized speed |
| Camera | C | Race only: rear chase ↔ cabin/hood view |

Driving is a pure fixed-timestep arcade model, not a rigid-body simulator. Longitudinal speed,
lateral grip, turn rate, drag, mass, collision impulse, and health are explicit data per vehicle
class. The renderer may exaggerate roll, pitch, suspension, and debris without changing the sim.

### Vehicle classes

| Class | Used in | Character |
|---|---|---|
| **Sport** | Race | Fastest, responsive, equalized competitive stats, fragile where damage is enabled |
| **Derby** | Last Madman, Carnage | Faster acceleration and turning; lower health and mass |
| **Monster** | Last Madman, Carnage | Slower, heavier, more health, stronger rams, can roll over small props |
| **Street** | Bomb Tag | Equalized hot rods so bomb rounds are decided by driving rather than loadout |

Class statistics are gameplay data. Color, decals, wheels, and uploaded art remain cosmetic.

### Collision and damage language

- Cars always collide physically. Damage is mode-controlled.
- A hit only deals authored ram damage when the contact enters a **front or rear bumper arc**.
  Side contact produces impulse and scrape effects but no ram damage.
- Damage is proportional to closing speed, bumper alignment, vehicle mass ratio, and the bumper's
  multiplier. Front bumpers hit harder than rear bumpers. A head-on collision can damage both cars.
- Impacts below a small speed threshold do no damage, so parking-lot contact is not punishing.
- A short per-car-pair cooldown prevents a single overlap from dealing damage every simulation tick.
- Cars communicate condition at 75/50/25% health through dents, smoke, fire, sound, and HUD color.
- At zero health a car becomes a wreck. Mode rules decide whether it remains as an obstacle,
  respawns, or eliminates its driver.

The authoritative host receives only normalized input intent. Clients never submit position,
velocity, health, lap count, hits, AI state, or destruction state.

## 4. Modes

### A. Race

**Fantasy:** a compact arcade race with close contact and a dramatic chase camera.

- 1–8 drivers; bots may fill the grid.
- Host chooses **1, 3, or 5 laps**; 3 is the default.
- Sport cars use equal performance stats so visual choices do not affect fairness.
- Circular/loop tracks use ordered checkpoints; a lap only counts after every checkpoint is crossed
  in order. Position is derived from laps plus progress to the next checkpoint.
- Starting grid is non-colliding for the countdown and first second to prevent spawn pileups.
- Race contact is physical but non-damaging in the default ruleset.
- First finisher wins; after the winner finishes, a 20-second grace timer marks remaining drivers DNF.
- Camera button switches between:
  - **rear chase:** pseudo-3D road projection behind the car;
  - **cabin/hood:** lower field of view with hood/dash foreground and stronger speed cues.
- Phaser remains the engine. The camera is a Mode-7-style/pseudo-3D projection of the same flat
  authoritative world, not a separate 3D physics implementation.

Initial content: one wide daytime loop, eight grid slots, barriers, tire stacks, boost pads, and a
finish gantry. Later tracks can add shortcuts and moving hazards without changing race rules.

### B. Last Madman Standing

**Fantasy:** demolition derby—make clean, fast bumper hits and be the last engine running.

- 2–8 drivers; solo practice adds bots.
- Host chooses Derby or Monster; mixed classes are allowed and deliberately asymmetric.
- High angled top-down camera shows the full local fight and nearby threats.
- Front/rear bumper damage uses the shared impact formula. Arena walls bounce cars but do little or
  no damage, keeping the focus on ramming opponents.
- A wreck remains as a low-friction obstacle for five seconds, then is removed.
- Last living driver wins the round. Default match is best of three; 1/3/5 rounds are available.
- To prevent hiding, sudden death begins after 75 seconds: the safe arena contracts and impacts deal
  progressively more damage. Remaining health is the timeout tie-break, then damage dealt.
- No random healing in the competitive default. Optional mutators can add repair pickups later.

Initial arena: **The Pit**, a 30 × 20 m concrete oval with hazard stripes and solid barriers.

### C. Carnage

**Fantasy:** two minutes to turn a toy-like city into a spectacular wreck while civilian traffic
and monster zombies make the streets unpredictable.

- 1–8 players, **co-op team score with individual bragging-rights stats**.
- Fixed match time: **2:00**.
- Derby and Monster vehicles are available; wrecked players respawn after three seconds with a
  small personal combo penalty so everyone keeps playing.
- Buildings, tunnels, and the outer boundary are non-destructible and form the collision/navigation
  shell. Everything else is authored as destructible: lamps, signs, hydrants, benches, bins,
  fences, bus stops, kiosks, parked cars, and selected facade props.
- Civilian bot cars follow a deterministic lane graph, obey simple junction reservations, react to
  obstacles, and can be hit/destroyed. They are vehicles, never people.
- Pedestrians are replaced by chunky **monster zombies**. They chase noise/cars, are knocked away or
  burst into stylized slime—no human gore.
- Score comes from prop value, civilian vehicle value, zombies, multi-destruction combos, airtime,
  and near-continuous movement. Repeating the easiest prop has diminishing value until the combo
  moves elsewhere.
- Shared city score is the headline result; the board also shows each player's destruction, largest
  combo, vehicle hits, and zombie count.
- Host owns traffic, zombies, props, timers, score, and respawns. Entity caps and spatial activation
  keep a full city within the network/performance budget.

Initial map: four city blocks around a central square, a looped traffic graph, one ramp alley, and
clear building footprints. Destruction is reset from the match seed on rematch.

### D. Bomb Tag (fourth mode)

**Fantasy:** hot potato at 100 km/h—ram the glowing bomb car before its fuse expires.

This mode is recommended because it creates pursuit, bluffing, passing, and last-second reversals
while reusing the vehicle/collision stack. It is mechanically distinct from a damage derby.

- 2–8 drivers in equalized Street cars.
- One randomly selected driver carries a visible, audible bomb with a 25-second fuse.
- A qualifying front/rear bumper hit transfers the bomb to the struck car. Scrapes do not transfer.
- The previous carrier has one second of return immunity, stopping instant ping-pong transfers.
- Ordinary collision damage is disabled. When the fuse expires, the carrier is eliminated in a
  large non-gory blast; a new bomb arms after a short reset.
- If a carrier disconnects or becomes invalid, the bomb moves deterministically to the nearest
  eligible driver.
- Last driver alive wins. With two players remaining, the arena contracts to keep the duel active.
- Round HUD always identifies the carrier, fuse, transfer immunity, and off-screen carrier direction.

Bomb ownership and eligible transfers are host-authoritative; the selection uses the match seed and
stable player ordering so host migration cannot fork the round.

## 5. Multiplayer and simulation requirements

- Reuse the existing Trystero WebRTC transport and shareable `?room=` links.
- Host-authoritative star over the peer mesh; lowest eligible connected player is migration fallback.
- Pure, engine-free simulation at a fixed 30 Hz. Phaser renders independently at display rate.
- Inputs are sent at 20–30 Hz; canonical snapshots at roughly 10–15 Hz with interpolation.
- Match start carries a seed, ordered roster, selected mode, map, mode settings, and vehicle choices.
- Coordinate-hash randomness only; no advancing global random cursor in the sim.
- Late joiners spectate the current round and become drivers on the next round/rematch.
- Host migration resumes from the last complete canonical snapshot. Timers use simulation ticks.
- Disconnect policy is mode-specific: Race = DNF, Derby/Bomb = eliminated, Carnage = remove car and
  preserve team score.
- Cap at 8 player cars. Carnage additionally caps active traffic, zombies, props, and transient events.
- Malformed or out-of-range input is clamped/dropped. No client-authored collision or score events.

## 6. Lobby, HUD, results, and accessibility

The warm-up room shows nickname, car color, allowed vehicle class, party list, room link, mode cards,
mode settings, bots, and host controls. Only the host changes the mode/map/settings; every player
chooses their own allowed vehicle and cosmetics. Start is disabled until the selected mode has enough
drivers (bots count).

Every HUD shares a speedometer, nitro, position/health as appropriate, mode objective, countdown,
and compact player state. Results show winner/team score, mode-specific stats, rematch, room return,
and a future merch-scorecard hook consistent with Arena/Overrun.

- Never rely on color alone: player chevrons carry a number/icon as well as color.
- Options: master/SFX/music volume, reduced camera shake, reduced flashes, and camera sensitivity/FOV.
- Respect reduced-motion where practical. Bomb and damage alerts use shape/text plus sound.
- Pause is unavailable online; local practice may pause.

## 7. Performance and quality gates

- Target 60 FPS at 1280 × 720 on a typical integrated-GPU office laptop; stay playable at 30 FPS.
- Initial load should use procedural art and existing dependencies only; sprite/audio assets widen later.
- Simulation determinism test: same seed + intent script gives identical state for at least 10k ticks.
- Collision tests cover front/rear/side classification, angle/speed scaling, mass, cooldown, separation,
  head-on damage, zero-speed overlap, and simultaneous wrecks.
- Network tests cover 8 peers, malformed input, host leave, missed snapshots, late spectator, and each
  mode's disconnect policy.
- Browser playtest matrix: Chrome/Firefox/Safari, two real devices, TURN path, keyboard focus, audio
  unlock, tab background/return, and rematch.
- Core modules import no Phaser, DOM, WebRTC, clocks, or `Math.random()`.

## 8. Scope boundaries

Not required for the first release: licensed cars, realistic drivetrain/gears, deformation physics,
split-screen, mobile touch controls, user-authored maps, persistent progression, open-world free roam,
or more than eight human drivers. Cosmetic damage is staged state, not arbitrary mesh deformation.

## 9. Delivery roadmap

### RM0 — Product definition and technical skeleton

- [x] Define the four modes, shared controls, damage rules, networking, UX, and quality gates.
- [x] Add the Road Madness pure-core module boundary and test project.
- [x] Create a playable local Last Madman Standing page with procedural placeholder art.

### RM1 — Last Madman local vertical slice

- [x] Fixed-tick acceleration, reverse/braking, speed-scaled steering, grip, handbrake, and drag.
- [x] Derby/Monster stats, car-to-car impulse, bumper/angle/speed damage, wrecks, and win condition.
- [x] Deterministic chase bots, angled arena renderer, HUD, result/rematch, and arcade wiring.
- [ ] Playtest and tune steering, collision impulse, damage, bot pressure, and arena dimensions.
- [x] Add nitro, wreck expiry, damage stages, smoke/fire, impact sparks, skid/nitro trails, and first SFX.
- [x] Add sudden-death contraction, impact escalation, timeout tie-breaks, and best-of rounds.

### RM2 — Online room and authority

- [ ] Road-specific protocol/codec and host-authoritative sync adapter.
- [ ] Warm-up room, share link, roster, host controls, car selection, countdown, bots.
- [ ] Interpolation/prediction, reconnect/spectate, host migration, network budget tests.
- [ ] Real multi-device and TURN-path playtest.

### RM3 — Derby content and feel

- [ ] Final Pit art/audio, damage stages, collision juice, car readability, accessibility options.
- [ ] Arena hazards and optional mutators behind host settings.
- [ ] Cross-browser hardening and tuning telemetry/playtest notes.

### RM4 — Race

- [ ] Checkpoint/lap/ranking core and track validation tools.
- [ ] Sport car tuning, grid/countdown, finish/DNF lifecycle, boost pads.
- [ ] Rear chase and cabin pseudo-3D renderers over the same canonical flat world.
- [ ] First loop track, bots/racing line, online tests, and playtest tuning.

### RM5 — Carnage

- [ ] Destructible prop registry, spatial activation, scoring/combo core, respawn lifecycle.
- [ ] Four-block city collision shell and deterministic lane graph/traffic.
- [ ] Monster zombies, reactions, caps, two-minute HUD, co-op results.
- [ ] Snapshot delta/budget profiling at maximum entity counts.

### RM6 — Bomb Tag

- [ ] Bomb state machine, deterministic selection, transfer qualification/immunity, explosion rounds.
- [ ] Carrier navigation cues, fuse audiovisual language, shrinking duel arena.
- [ ] Disconnect/host-migration edge cases and multiplayer balance pass.

### RM7 — Ship and widen

- [ ] Gamepad, richer art/audio, additional arenas/tracks/city layouts, saved stats/achievements.
- [ ] Full accessibility/browser/device pass, production build/deploy, residual-risk documentation.

## 10. Success signals

- A new player can join and drive without being taught beyond the control card.
- A room reaches the first match in under 60 seconds and starts a rematch in under 15 seconds.
- Most collisions are visually understandable: players can tell who hit whom and why damage happened.
- Each mode produces a different team story: photo finish, derby comeback, city combo, bomb handoff.
- Eight-player sessions remain stable and responsive under the defined entity and bandwidth caps.

/**
 * Dev sandbox driver: a local, zero-netcode OverrunDriver (same shape the OverrunSession implements, so
 * the renderer is identical) that steps the real `stepShooter` over a sandbox world. It drops straight
 * in (no countdown) and tames the sim for open-ended testing WITHOUT any sim changes:
 *  - the wave machinery is neutralised each frame (pending/intermission/stage cleared, wave pinned to 1),
 *  - "AI off" freezes every enemy in place via a huge stun (still killable — bullets ignore stun),
 *  - the local player is revived in place instead of the run ever ending.
 * Exposes live controls for the dev overlay. Gated to dev builds by the page that mounts it.
 */

import { PLAYER_HEALTH } from "./constants";
import { ENEMY_KINDS } from "./enemies";
import { TOTAL_STAGES } from "./stages";
import { stepShooter } from "./sim";
import { inputToShooterIntent, initialShooterMemory } from "./intent";
import { freshAmmo } from "./weapons";
import { createOverrunSandboxWorld, type OverrunSandboxConfig } from "./sandbox";
import type { OverrunDriver, OverrunMeta } from "./render/contract";
import type { EnemyKind, GunId, PlayerId, RawShooterInput, ShooterInputMemory, ShooterWorld } from "./types";

const LOCAL = "you";
/** Absurd stun that makes the sim hold a frozen enemy still (and suppress its attacks) indefinitely. */
const FREEZE_STUN = 1e9;

export class OverrunSandboxDriver implements OverrunDriver {
  readonly localId = LOCAL;
  private config: OverrunSandboxConfig;
  private world: ShooterWorld;
  private mem: ShooterInputMemory = initialShooterMemory();
  private aiOn: boolean;

  constructor(config: OverrunSandboxConfig) {
    this.config = config;
    this.aiOn = config.ai;
    this.world = createOverrunSandboxWorld(config);
  }

  getMeta(_id: PlayerId): OverrunMeta {
    return { name: "You", colorIndex: 0 };
  }

  frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number } {
    if (!this.aiOn) {
      this.world = { ...this.world, enemies: this.world.enemies.map((e) => ({ ...e, stunRemaining: FREEZE_STUN })) };
    }
    const { intent, memory } = inputToShooterIntent(input, this.mem);
    this.mem = memory;
    this.world = stepShooter(this.world, { [LOCAL]: intent }, dt);

    // Enemy-inspection mode keeps the wave machinery inert (no composed waves / intermissions / stage
    // beats). Stage mode lets it all run for real, so this is skipped.
    if (this.config.stage == null && (this.world.pending.length || this.world.intermission || (this.world.stageIntroRemaining ?? 0) || this.world.wave !== 1)) {
      this.world = { ...this.world, wave: 1, pending: [], intermission: 0, stageIntroRemaining: 0 };
    }
    // Keep the harness running: revive the local player in place rather than ever ending the run.
    const you = this.world.players[LOCAL];
    if (this.world.phase !== "playing" || !you || you.status !== "alive") {
      const p = you ?? this.world.players[LOCAL]!;
      this.world = {
        ...this.world,
        phase: "playing",
        players: { ...this.world.players, [LOCAL]: { ...p, status: "alive", health: PLAYER_HEALTH, reviveProgress: 0 } },
      };
    }
    return { world: this.world, countdown: 0 };
  }

  // ---- live dev controls -----------------------------------------------------

  isAiOn(): boolean {
    return this.aiOn;
  }

  getConfig(): OverrunSandboxConfig {
    return this.config;
  }

  respawn(): void {
    this.world = createOverrunSandboxWorld(this.config);
    this.mem = initialShooterMemory();
  }

  toggleAi(): void {
    this.aiOn = !this.aiOn;
    // Un-freeze on enable — the freeze pins a huge stun that would otherwise persist.
    if (this.aiOn) this.world = { ...this.world, enemies: this.world.enemies.map((e) => ({ ...e, stunRemaining: 0 })) };
  }

  setGun(gun: GunId): void {
    this.config = { ...this.config, gun };
    const you = this.world.players[LOCAL];
    if (you) this.world = { ...this.world, players: { ...this.world.players, [LOCAL]: { ...you, gun, ammo: freshAmmo(gun) } } };
  }

  /** Cycle the (first) target kind forward/back through every enemy kind, then respawn. */
  cycleKind(dir: 1 | -1): void {
    const current = this.config.kinds[0] ?? "rusher";
    const i = Math.max(0, ENEMY_KINDS.indexOf(current));
    const next: EnemyKind = ENEMY_KINDS[(i + dir + ENEMY_KINDS.length) % ENEMY_KINDS.length]!;
    this.config = { ...this.config, kinds: [next] };
    this.respawn();
  }

  isCampaign(): boolean {
    return this.config.stage != null;
  }

  /** Launch (or relaunch) a real campaign run at the given stage. */
  setStage(stage: number): void {
    this.config = { ...this.config, stage: Math.max(1, Math.min(TOTAL_STAGES, Math.floor(stage))) };
    this.respawn();
  }

  /** Leave campaign mode, back to hand-placed enemy inspection. */
  setEnemyMode(): void {
    this.config = { ...this.config, stage: null };
    this.respawn();
  }
}

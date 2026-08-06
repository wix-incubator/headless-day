/**
 * Dev sandbox driver: a local, zero-netcode MatchDriver (same shape the Session/SoloDriver implement,
 * so the renderer is identical) that steps the real `stepWorld` over a sandbox World. No countdown —
 * it drops straight in — and it exposes live controls (respawn / toggle AI / cycle target / swap
 * weapon) for the dev overlay. See docs/superpowers/specs/2026-07-14-arena-sandbox-design.md.
 */

import type { Intent, PlayerId, RawInput, World } from "./types";
import { stepWorld } from "./sim";
import { initialMemory, inputToIntent } from "./intent";
import { botIntent } from "./bot";
import type { FramePacket, MatchDriver, PlayerMeta } from "./render/contract";
import { DEFAULT_SHAPE } from "./cosmetic";
import { ENEMY_STATS } from "./survival/enemy";
import type { SurvivalEnemyKind } from "./survival/waves";
import { createSandboxWorld, type SandboxConfig, type SandboxTarget } from "./sandbox";
import type { Weapon } from "./weapons";

const LOCAL = "you";
/** What `[` / `]` cycles through — every enemy kind plus the versus dummy (switches sub-mode live). */
const CYCLE: SandboxTarget[] = [...(Object.keys(ENEMY_STATS) as SurvivalEnemyKind[]), "dummy"];

export class SandboxDriver implements MatchDriver {
  readonly localId = LOCAL;
  private config: SandboxConfig;
  private world: World;
  private mem = initialMemory();
  private aiOn: boolean;
  private meta: Record<PlayerId, PlayerMeta> = {};

  constructor(config: SandboxConfig) {
    this.config = config;
    this.aiOn = config.ai === "on";
    this.world = createSandboxWorld(config);
    this.refreshMeta();
  }

  getMeta(id: PlayerId): PlayerMeta {
    return this.meta[id] ?? { name: id === LOCAL ? "You" : id, shape: DEFAULT_SHAPE };
  }

  frame(dt: number, input: RawInput): FramePacket {
    // Live-apply the AI toggle: survival freezes/unfreezes its enemies via the world flag.
    if (this.world.survival && !!this.world.survival.frozen === this.aiOn) {
      this.world = { ...this.world, survival: { ...this.world.survival, frozen: !this.aiOn } };
    }
    const { intent, memory } = inputToIntent(input, this.mem);
    this.mem = memory;
    const intents: Record<PlayerId, Intent> = { [LOCAL]: intent };
    // Versus dummies only act when AI is on — then the existing bot brain drives them to fight back.
    if (this.aiOn && !this.world.survival) {
      for (const id of Object.keys(this.world.players)) {
        if (id !== LOCAL) intents[id] = botIntent(id, this.world);
      }
    }
    this.world = stepWorld(this.world, intents, dt);
    return { world: this.world, countdown: 0 };
  }

  // ---- live dev controls -----------------------------------------------------

  isAiOn(): boolean {
    return this.aiOn;
  }

  getConfig(): SandboxConfig {
    return this.config;
  }

  respawn(): void {
    this.world = createSandboxWorld(this.config);
    this.mem = initialMemory();
    this.refreshMeta();
  }

  toggleAi(): void {
    this.aiOn = !this.aiOn;
  }

  setWeapon(weapon: Weapon): void {
    this.config = { ...this.config, weapon };
    // Swap in place so the current target layout / health under test isn't reset.
    const you = this.world.players[LOCAL];
    if (you) {
      this.world = { ...this.world, players: { ...this.world.players, [LOCAL]: { ...you, weapon } } };
    }
  }

  /** Cycle the (single) target kind forward/back through every enemy + the dummy, then respawn. */
  cycleEnemy(dir: 1 | -1): void {
    const current = this.config.targets[0] ?? "crawler";
    const i = Math.max(0, CYCLE.indexOf(current));
    const next = CYCLE[(i + dir + CYCLE.length) % CYCLE.length]!;
    this.config = { ...this.config, targets: [next] };
    this.respawn();
  }

  private refreshMeta(): void {
    this.meta = Object.fromEntries(
      Object.keys(this.world.players).map((id) => [
        id,
        { name: id === LOCAL ? "You" : `Dummy ${id.split(":")[1] ?? ""}`.trim(), shape: DEFAULT_SHAPE },
      ]),
    );
  }
}

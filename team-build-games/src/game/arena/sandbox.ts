/**
 * Dev sandbox: parse the URL query into a config, then build a ready-to-step World — either a survival
 * world with frozen, pre-placed enemies, or a versus world with frozen player-shaped dummies. Pure
 * (no DOM/engine); it drives the REAL stepWorld + renderer paths so what you inspect is what ships.
 * See docs/superpowers/specs/2026-07-14-arena-sandbox-design.md. Gated to dev builds by the caller.
 */

import type { PlayerId, PlayerState, World } from "./types";
import { coerceWeapon, type Weapon } from "./weapons";
import { createPlayer } from "./match";
import { createRun } from "./survival/campaign";
import { createEnemy, ENEMY_STATS, type EnemyState } from "./survival/enemy";
import type { SurvivalState } from "./survival/step";
import type { SurvivalEnemyKind } from "./survival/waves";
import { FIELD_M } from "../constants";

/** A spawnable target: any survival enemy kind, or a player-shaped versus dummy. */
export type SandboxTarget = SurvivalEnemyKind | "dummy";
export type SandboxAi = "off" | "on" | "toggle";

export interface SandboxConfig {
  /** Kinds to spawn, cycled round-robin over `count`. */
  targets: SandboxTarget[];
  count: number;
  ai: SandboxAi;
  weapon: Weapon;
  /** Target health override, or null for the per-target default. */
  hp: number | null;
  /** Spawn distance ahead of the player, metres. */
  dist: number;
}

const ENEMY_KINDS = Object.keys(ENEMY_STATS) as SurvivalEnemyKind[];
const LOCAL = "you";
const DUMMY_HP = 20;
const MAX_TARGETS = 16;

const isEnemyKind = (s: string): s is SurvivalEnemyKind => (ENEMY_KINDS as string[]).includes(s);

function clampInt(raw: string | null, min: number, max: number, dflt: number): number {
  const n = raw == null ? NaN : Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
}

/** Parse the sandbox query params into a fully-defaulted, clamped config. Unknown values fall back. */
export function parseSandboxConfig(params: URLSearchParams): SandboxConfig {
  const rawTargets = (params.get("enemy") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SandboxTarget => s === "dummy" || isEnemyKind(s));
  const targets: SandboxTarget[] = rawTargets.length ? rawTargets : ["crawler"];

  const aiRaw = params.get("ai");
  const ai: SandboxAi = aiRaw === "on" || aiRaw === "toggle" ? aiRaw : "off";

  const hpN = Math.floor(Number(params.get("hp")));
  const hp = Number.isFinite(hpN) && hpN > 0 ? hpN : null;

  const distN = Number(params.get("dist"));
  const dist = Number.isFinite(distN) && distN > 0 ? Math.max(1, Math.min(12, distN)) : 4;

  return {
    targets,
    count: clampInt(params.get("count"), 1, MAX_TARGETS, 1),
    ai,
    weapon: coerceWeapon(params.get("weapon") ?? undefined),
    hp,
    dist,
  };
}

/** Build the ready-to-step sandbox World for a config: versus (all dummies) or survival (enemies). */
export function createSandboxWorld(config: SandboxConfig): World {
  const c = FIELD_M / 2;
  const you = createPlayer(LOCAL, { x: c, y: c }, "right", config.weapon);
  // Targets line up to the player's right, `dist` metres out, so a right-facing swing reaches them.
  const targetPos = (i: number) => ({ x: c + config.dist + i * 1.6, y: c });

  // Versus sub-mode: every target is a player-shaped dummy → a normal versus World, win-condition off.
  if (config.targets.every((t) => t === "dummy")) {
    const players: Record<PlayerId, PlayerState> = { [LOCAL]: you };
    for (let i = 0; i < config.count; i++) {
      const dummy = createPlayer(`dummy:${i}`, targetPos(i), "left", "sword");
      players[dummy.id] = { ...dummy, health: config.hp ?? DUMMY_HP };
    }
    return { mode: "ffa", players, projectiles: [], phase: "playing", tick: 0, winnerId: null, sandbox: true };
  }

  // Survival sub-mode: pre-place enemies, freeze unless AI is on, no waves/progression/auto-end.
  const cycle = config.targets.filter((t): t is SurvivalEnemyKind => t !== "dummy");
  const kinds: SurvivalEnemyKind[] = cycle.length ? cycle : ["crawler"];
  const enemies: EnemyState[] = [];
  for (let i = 0; i < config.count; i++) {
    const base = createEnemy(`sbx:${i}`, kinds[i % kinds.length]!, targetPos(i), 0);
    enemies.push(
      config.hp != null ? { ...base, health: config.hp, maxHealth: Math.max(base.maxHealth, config.hp) } : base,
    );
  }
  const survival: SurvivalState = {
    seed: 1,
    fieldM: FIELD_M,
    run: createRun(),
    partySizeThisWave: 1,
    waveStartTick: 0,
    spawnCursor: 0,
    outcome: null,
    frozen: config.ai !== "on",
    sandbox: true,
  };
  return {
    mode: "coop-survival",
    players: { [LOCAL]: you },
    projectiles: [],
    phase: "playing",
    tick: 0,
    winnerId: null,
    enemies,
    survival,
  };
}

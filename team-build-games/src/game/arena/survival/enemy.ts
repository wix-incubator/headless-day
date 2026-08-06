/**
 * Survival enemy model (P-A2). Host-owned creatures that spawn outside the field and crawl toward the
 * allied party. Pure data + a wire-trust boundary (`coerceEnemy`) so a snapshot from an untrusted host
 * can only ever produce a well-formed enemy. Deterministic ids `e{level}-{seq}` are assigned by the
 * wave/step logic; the model itself holds no counters.
 */

import type { Direction, Vec2 } from "../types";
import type { SurvivalEnemyKind } from "./waves";

export interface EnemyStats {
  maxHealth: number;
  /** Metres per second crawling toward the party. */
  speed: number;
  /** Health removed from a player on contact. */
  contactDamage: number;
  /** Seconds between contact hits from the same enemy. */
  hitCooldown: number;
  /** Body radius (metres) for contact + separation, and the melee/arrow footprint width. */
  radius: number;
  /**
   * Drawn standing height (metres, world-y) of the sprite above its footprint — the vertical extent
   * of the melee hit capsule, so a tall dino is hittable up its whole silhouette and a low crawler
   * is not over-extended. Tuned to the art (kept roughly in sync with the sprite proportions).
   */
  hitHeight: number;
}

/** Seconds a monster is staggered (reeling, can't chase or bite) after being hit. */
export const ENEMY_HIT_STUN_S = 0.2;
/** Metres a monster is shoved away from the attacker on a hit. */
export const ENEMY_HIT_PUSHBACK_M = 0.5;

/** Per-kind stat table. `crawler` mirrors the ant for old snapshots and tests. */
export const ENEMY_STATS: Record<SurvivalEnemyKind, EnemyStats> = {
  crawler: { maxHealth: 2, speed: 2.4, contactDamage: 1, hitCooldown: 0.8, radius: 0.55, hitHeight: 1.3 },
  ant: { maxHealth: 2, speed: 2.7, contactDamage: 1, hitCooldown: 0.75, radius: 0.55, hitHeight: 1.3 },
  zombie: { maxHealth: 4, speed: 1.65, contactDamage: 1, hitCooldown: 1, radius: 0.65, hitHeight: 1.9 },
  bat: { maxHealth: 2, speed: 3.25, contactDamage: 1, hitCooldown: 0.7, radius: 0.5, hitHeight: 1.1 },
  dino: { maxHealth: 12, speed: 1.35, contactDamage: 2, hitCooldown: 1.35, radius: 1.05, hitHeight: 2.8 },
  clawed: { maxHealth: 7, speed: 2, contactDamage: 1, hitCooldown: 0.9, radius: 0.8, hitHeight: 2.2 },
};

export interface EnemyState {
  id: string;
  kind: SurvivalEnemyKind;
  pos: Vec2;
  facing: Direction;
  aim: number;
  health: number;
  maxHealth: number;
  status: "alive" | "dead";
  hitCooldownRemaining: number;
  /**
   * Seconds of hit-stagger left. While > 0 the monster is reeling — it doesn't chase or bite, having
   * just been shoved back. Also the "hit state" the renderer reads to flash / (later) swap to a hit
   * sprite. 0 = acting normally.
   */
  hitStunRemaining: number;
  spawnTick: number;
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const KINDS = Object.keys(ENEMY_STATS) as SurvivalEnemyKind[];
const DEFAULT_KIND: SurvivalEnemyKind = "crawler";

export function createEnemy(id: string, kind: SurvivalEnemyKind, pos: Vec2, spawnTick: number): EnemyState {
  const stats = ENEMY_STATS[kind];
  return {
    id,
    kind,
    pos: { x: pos.x, y: pos.y },
    facing: "down",
    aim: Math.PI / 2,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
    status: "alive",
    hitCooldownRemaining: 0,
    hitStunRemaining: 0,
    spawnTick,
  };
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Sanitize an untrusted enemy from the wire into a well-formed one (host snapshot trust boundary). */
export function coerceEnemy(raw: unknown): EnemyState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = KINDS.includes(r.kind as SurvivalEnemyKind) ? (r.kind as SurvivalEnemyKind) : DEFAULT_KIND;
  const maxHealth = ENEMY_STATS[kind].maxHealth;
  const pos = (r.pos ?? {}) as { x?: unknown; y?: unknown };
  const health = Math.max(0, Math.min(maxHealth, num(r.health, 0)));
  return {
    id: typeof r.id === "string" ? r.id : "",
    kind,
    pos: { x: num(pos.x, 0), y: num(pos.y, 0) },
    facing: DIRECTIONS.includes(r.facing as Direction) ? (r.facing as Direction) : "down",
    aim: num(r.aim, 0),
    health,
    maxHealth,
    status: health > 0 && r.status === "alive" ? "alive" : "dead",
    hitCooldownRemaining: Math.max(0, num(r.hitCooldownRemaining, 0)),
    hitStunRemaining: Math.max(0, num(r.hitStunRemaining, 0)),
    spawnTick: Math.max(0, Math.floor(num(r.spawnTick, 0))),
  };
}

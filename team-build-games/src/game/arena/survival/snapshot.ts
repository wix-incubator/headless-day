/**
 * Coop Survival wire snapshot: the host serializes its authoritative SurvivalWorld each broadcast,
 * and peers rebuild it through a strict trust boundary. Players ride the wire as-is (same lenient
 * treatment as the versus snapshot — the host owns them), but the survival-specific state that a
 * malicious/garbage host could use to fork or crash a peer — the enemy array, the campaign run, the
 * spawn cursor — is sanitized here: every enemy through `coerceEnemy`, the run/counters clamped to a
 * valid campaign. Pure; no engine/DOM/clock/RNG. Kept out of the shared protocol so survival stays
 * independently testable — protocol.ts imports these when the snapshot message is wired up.
 */

import type { PlayerId, PlayerState, Projectile } from "../types";
import { coerceEnemy, type EnemyState } from "./enemy";
import type { SurvivalOutcome, SurvivalState, SurvivalWorld } from "./step";
import type { RunPhase, SurvivalRun } from "./campaign";

export interface SurvivalSnapshot {
  tick: number;
  phase: "playing" | "ended";
  outcome: SurvivalOutcome;
  seed: number;
  fieldM: number;
  players: Record<PlayerId, PlayerState>;
  enemies: EnemyState[];
  run: SurvivalRun;
  partySizeThisWave: number;
  waveStartTick: number;
  spawnCursor: number;
  projectiles: Projectile[];
}

/** Serialize the host's world for broadcast (structural copy — JSON-safe, no engine refs). */
export function survivalSnapshot(world: SurvivalWorld): SurvivalSnapshot {
  return {
    tick: world.tick,
    phase: world.phase,
    outcome: world.outcome,
    seed: world.seed,
    fieldM: world.fieldM,
    players: world.players,
    enemies: world.enemies,
    run: world.run,
    partySizeThisWave: world.partySizeThisWave,
    waveStartTick: world.waveStartTick,
    spawnCursor: world.spawnCursor,
    projectiles: world.projectiles,
  };
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const nonNegInt = (v: unknown): number => Math.max(0, Math.floor(num(v, 0)));
const RUN_PHASES: RunPhase[] = ["active", "won", "failed"];
const OUTCOMES: Exclude<SurvivalOutcome, null>[] = ["won", "lost"];

/** Clamp an untrusted run object into a valid campaign state. */
function coerceRun(raw: unknown): SurvivalRun {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    level: Math.max(1, Math.floor(num(r.level, 1))),
    wave: Math.max(1, Math.floor(num(r.wave, 1))),
    phase: RUN_PHASES.includes(r.phase as RunPhase) ? (r.phase as RunPhase) : "active",
    wavesPerLevel: Math.max(1, Math.floor(num(r.wavesPerLevel, 3))),
    campaignLevels: Math.max(1, Math.floor(num(r.campaignLevels, 5))),
    endless: r.endless === true,
  };
}

/**
 * Sanitize the `survival` block that rides on a shared World snapshot (the netcode path). Same clamps
 * as the standalone snapshot above, minus the players/enemies which the World carries directly.
 */
export function coerceSurvivalState(raw: unknown): SurvivalState {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    seed: num(r.seed, 1),
    fieldM: num(r.fieldM, 0) > 0 ? num(r.fieldM, 30) : 30,
    run: coerceRun(r.run),
    partySizeThisWave: Math.max(1, Math.floor(num(r.partySizeThisWave, 1))),
    waveStartTick: nonNegInt(r.waveStartTick),
    spawnCursor: nonNegInt(r.spawnCursor),
    outcome: OUTCOMES.includes(r.outcome as never) ? (r.outcome as SurvivalOutcome) : null,
  };
}

/** Rebuild a SurvivalWorld from an untrusted snapshot, sanitizing every survival-owned field. */
export function survivalWorldFromSnapshot(raw: SurvivalSnapshot): SurvivalWorld {
  const r = (raw ?? {}) as unknown as Record<string, unknown>;
  const outcome = OUTCOMES.includes(r.outcome as never) ? (r.outcome as SurvivalOutcome) : null;
  return {
    phase: r.phase === "ended" ? "ended" : "playing",
    outcome,
    tick: nonNegInt(r.tick),
    seed: num(r.seed, 1),
    fieldM: num(r.fieldM, 0) > 0 ? num(r.fieldM, 30) : 30,
    players: (r.players && typeof r.players === "object" ? r.players : {}) as Record<PlayerId, PlayerState>,
    enemies: Array.isArray(r.enemies) ? r.enemies.map(coerceEnemy) : [],
    run: coerceRun(r.run),
    partySizeThisWave: Math.max(1, Math.floor(num(r.partySizeThisWave, 1))),
    waveStartTick: nonNegInt(r.waveStartTick),
    spawnCursor: nonNegInt(r.spawnCursor),
    projectiles: Array.isArray(r.projectiles) ? (r.projectiles as Projectile[]) : [],
  };
}

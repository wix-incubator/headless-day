/**
 * Wave engine: a points budget (escalating with the wave, proportional to the
 * frozen partySize) is spent on enemy kinds; spawns land on the field perimeter.
 * All draws are coordinate-hashed off (seed, wave|spawnSeq) — reproducible anywhere.
 */

import { OVERRUN_FIELD_M } from "./constants";
import { ENEMIES } from "./enemies";
import { stageForWave, wavesForStage } from "./stages";
import { hash01 } from "./rng";
import type { EnemyKind, Vec2 } from "./types";

const BASE_BUDGET = 6;
const BUDGET_PER_WAVE = 4;
const TANK_MIX = 0.25;
/** Each campaign stage is ~15% heavier than the last (its budget uses the STAGE-RELATIVE wave). */
const STAGE_BUDGET_MULT = 0.15;

/**
 * Endless-run wire/CPU guard: `pending` re-ships in full on any wave-start delta
 * (see codec.ts diffWorld), and the host must keep spawning it every tick — so an
 * uncapped budget (e.g. 8 players, wave 50 → ~927 pending) can blow both the wire
 * and host CPU. Budget beyond this cap is simply dropped; composeWave stops queueing.
 */
export const MAX_PENDING = 150;

/** Points to spend on this wave. partySize is frozen at wave start (mid-wave churn immune). */
export function waveBudget(wave: number, partySize: number): number {
  return Math.round((BASE_BUDGET + BUDGET_PER_WAVE * wave) * (0.5 + 0.5 * partySize));
}

/** A campaign stage's normal-wave enemy roster + parallel draw weights. */
interface Pool {
  kinds: EnemyKind[];
  weights: number[];
}

/**
 * Which kinds may spawn (and how often) on a campaign stage/wave. Stage 1 is rushers-only until its
 * wave 3; from stage 3 the swarmling horde joins. Extended per roster increment (spitter, exploder,
 * hive…) — the boss finale is composed separately, not from this pool.
 */
function stagePool(stage: number, waveInStage: number): Pool {
  if (stage === 1) {
    return waveInStage < 3 ? { kinds: ["rusher"], weights: [1] } : { kinds: ["rusher", "tank"], weights: [3, 1] };
  }
  if (stage === 2) return { kinds: ["rusher", "tank"], weights: [3, 1] };
  if (stage === 3) return { kinds: ["rusher", "swarmling", "tank"], weights: [3, 3, 1] };
  // Stage 4+: ranged/AoE pressure ramps in. S4 adds the spitter; S5 the exploder (death AoE); S6 the
  // hive (spawner) on top — the 10-wave finale fields the whole roster.
  if (stage === 4) return { kinds: ["rusher", "swarmling", "tank", "spitter"], weights: [3, 3, 1, 1] };
  if (stage === 5) return { kinds: ["rusher", "swarmling", "tank", "spitter", "exploder"], weights: [3, 3, 2, 1, 1] };
  return { kinds: ["rusher", "swarmling", "tank", "spitter", "exploder", "hive"], weights: [2, 3, 2, 2, 1, 1] }; // stage 6
}

/** Weighted pick among the pool's AFFORDABLE kinds (cost ≤ points); null when nothing fits. */
function drawKind(seed: number, wave: number, i: number, pool: Pool, points: number): EnemyKind | null {
  const affordable = pool.kinds
    .map((k, idx) => ({ k, w: pool.weights[idx] ?? 1 }))
    .filter((x) => ENEMIES[x.k].cost <= points);
  if (affordable.length === 0) return null;
  const total = affordable.reduce((a, x) => a + x.w, 0);
  let r = hash01(seed, "mix", wave, i) * total;
  for (const x of affordable) {
    if (r < x.w) return x.k;
    r -= x.w;
  }
  return affordable[affordable.length - 1]!.k;
}

/** Campaign budget: stage-relative wave × per-stage multiplier (progression resets each stage). */
function campaignBudget(stage: number, waveInStage: number, partySize: number): number {
  return Math.round(
    (BASE_BUDGET + BUDGET_PER_WAVE * waveInStage) * (0.5 + 0.5 * partySize) * (1 + (stage - 1) * STAGE_BUDGET_MULT),
  );
}

/** The wave's spawn queue: kinds drawn per-slot off (seed, "mix", wave, i). Capped at MAX_PENDING. */
export function composeWave(
  seed: number,
  wave: number,
  partySize: number,
  opts: { campaign?: boolean } = {},
): EnemyKind[] {
  const queue: EnemyKind[] = [];
  if (opts.campaign) {
    const { stage, waveInStage } = stageForWave(wave);
    // Stage-5 finale is the mega-boss beat: a lone Kraken (HP is party-scaled at spawn, not here).
    if (stage === 5 && waveInStage === wavesForStage(5)) return ["kraken"];
    const pool = stagePool(stage, waveInStage);
    let points = campaignBudget(stage, waveInStage, partySize);
    for (let i = 0; queue.length < MAX_PENDING; i++) {
      const kind = drawKind(seed, wave, i, pool, points);
      if (!kind) break;
      queue.push(kind);
      points -= ENEMIES[kind].cost;
    }
    return queue;
  }
  // Survival: the original flat budget model (tanks gated by minWave), untouched.
  let points = waveBudget(wave, partySize);
  const allowTank = wave >= ENEMIES.tank.minWave;
  for (let i = 0; points > 0 && queue.length < MAX_PENDING; i++) {
    const tankOk = allowTank && points >= ENEMIES.tank.cost;
    const kind: EnemyKind = tankOk && hash01(seed, "mix", wave, i) < TANK_MIX ? "tank" : "rusher";
    queue.push(kind);
    points -= ENEMIES[kind].cost;
  }
  return queue;
}

/** Perimeter position for the Nth spawn: walk the square's edge by a hashed parameter. */
export function spawnPos(seed: number, spawnSeq: number): Vec2 {
  const t = hash01(seed, "spawn", spawnSeq) * 4;
  const f = OVERRUN_FIELD_M;
  const d = (t % 1) * f;
  if (t < 1) return { x: d, y: 0 };
  if (t < 2) return { x: f, y: d };
  if (t < 3) return { x: f - d, y: f };
  return { x: 0, y: f - d };
}

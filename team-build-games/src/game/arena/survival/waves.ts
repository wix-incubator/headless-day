import { survivalRandom } from "./rng";

/** `crawler` is retained as a wire-compatible alias for old Survival snapshots. */
export type SurvivalEnemyKind = "crawler" | "ant" | "zombie" | "bat" | "dino" | "clawed";
export type SpawnableSurvivalEnemyKind = Exclude<SurvivalEnemyKind, "crawler">;

export interface PlannedEnemySpawn {
  id: string;
  kind: SurvivalEnemyKind;
  /** Tick relative to the start of this wave. */
  atTick: number;
  /** Angle around the arena perimeter in radians. */
  angle: number;
}

export interface SurvivalWavePlan {
  level: number;
  wave: number;
  partySize: number;
  spawns: PlannedEnemySpawn[];
}

export const MAX_CONCURRENT_ENEMIES = 64;

const KINDS_BY_LEVEL: readonly (readonly SpawnableSurvivalEnemyKind[])[] = [
  ["ant", "zombie"],
  ["ant", "zombie", "bat"],
  ["ant", "zombie", "bat", "clawed"],
  ["ant", "zombie", "bat", "clawed", "dino"],
];

/** Deterministic roster progression: agile and heavy creatures enter on later levels. */
export function enemyKindForSpawn(
  seed: number,
  level: number,
  wave: number,
  index: number,
  id: string,
): SpawnableSurvivalEnemyKind {
  const roster = KINDS_BY_LEVEL[Math.min(KINDS_BY_LEVEL.length, Math.max(1, level)) - 1]!;
  const roll = survivalRandom(seed, wave * 10_000 + index, id, "enemy-kind");
  return roster[Math.min(roster.length - 1, Math.floor(roll * roster.length))]!;
}

/** Sub-linear party scaling keeps larger groups busy without multiplying the horde eightfold. */
export function waveEnemyCount(level: number, wave: number, partySize: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeWave = Math.max(1, Math.floor(wave));
  const safeParty = Math.max(1, Math.floor(partySize));
  const base = 3 + safeLevel * 2 + safeWave;
  return Math.min(MAX_CONCURRENT_ENEMIES, Math.ceil(base * safeParty ** 0.8));
}

/** Pure deterministic plan. Call order elsewhere cannot alter these spawn decisions. */
export function wavePlan(
  seed: number,
  level: number,
  wave: number,
  partySize: number,
): SurvivalWavePlan {
  const frozenPartySize = Math.max(1, Math.floor(partySize));
  const count = waveEnemyCount(level, wave, frozenPartySize);
  const spacingTicks = Math.max(6, 18 - Math.max(1, level));
  const spawns = Array.from({ length: count }, (_, index): PlannedEnemySpawn => {
    const id = `e${level}-${wave}-${index}`;
    return {
      id,
      kind: enemyKindForSpawn(seed, level, wave, index, id),
      atTick: index * spacingTicks,
      angle: survivalRandom(seed, index, id, "spawn-angle") * Math.PI * 2,
    };
  });
  return { level, wave, partySize: frozenPartySize, spawns };
}

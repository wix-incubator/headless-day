/**
 * Pure survival campaign state machine (P-A3 loop logic, isolated + deterministic).
 *
 * A run is a sequence of LEVELS, each of `wavesPerLevel` waves. Clearing a level's last wave levels
 * up and marks a revive point (downed allies come back). A finite campaign of `campaignLevels` is WON
 * when its final wave clears; `endless` runs never win and keep escalating. A full-party wipe FAILS.
 * No clock/RNG — the step reducer drives this as waves resolve, so every peer agrees on progression.
 */

export type RunPhase = "active" | "won" | "failed";

export interface SurvivalRun {
  level: number; // 1-based
  wave: number; // 1-based within the level
  phase: RunPhase;
  wavesPerLevel: number;
  campaignLevels: number;
  endless: boolean;
}

export function createRun(opts: { wavesPerLevel?: number; campaignLevels?: number; endless?: boolean } = {}): SurvivalRun {
  return {
    level: 1,
    wave: 1,
    phase: "active",
    wavesPerLevel: Math.max(1, Math.floor(opts.wavesPerLevel ?? 3)),
    campaignLevels: Math.max(1, Math.floor(opts.campaignLevels ?? 5)),
    endless: opts.endless ?? false,
  };
}

/**
 * Resolve a cleared wave. Returns the next run state and whether a LEVEL just completed
 * (`leveled` → the caller revives downed allies before the next level).
 */
export function clearWave(run: SurvivalRun): { run: SurvivalRun; leveled: boolean } {
  if (run.phase !== "active") return { run, leveled: false };

  if (run.wave < run.wavesPerLevel) {
    return { run: { ...run, wave: run.wave + 1 }, leveled: false };
  }

  // Last wave of the level → level complete.
  const nextLevel = run.level + 1;
  if (!run.endless && nextLevel > run.campaignLevels) {
    return { run: { ...run, phase: "won" }, leveled: true }; // final level of a finite campaign
  }
  return { run: { ...run, level: nextLevel, wave: 1 }, leveled: true };
}

/** A full-party wipe ends the run. */
export function wipe(run: SurvivalRun): SurvivalRun {
  return run.phase === "active" ? { ...run, phase: "failed" } : run;
}

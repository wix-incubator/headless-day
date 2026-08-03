/**
 * Pure survival run summary — derives the numbers the SurvivalHud and the end-of-run result screen
 * show (campaign progress, allies up/down, enemies left, a mode-aware headline). Read-only over the
 * SurvivalWorld; no engine/DOM/clock/RNG, so the same world always yields the same summary and it can
 * be unit-tested in isolation. The render layer consumes this at wire-up time.
 */

import type { SurvivalWorld } from "./step";

export interface SurvivalSummary {
  phase: SurvivalWorld["phase"];
  outcome: SurvivalWorld["outcome"];
  /** Current campaign level (1-based). */
  level: number;
  /** Current wave within the level (1-based). */
  wave: number;
  /** Waves fully cleared so far (all of them on a campaign win). */
  wavesCleared: number;
  /** Live (non-dead) enemies on the field. */
  enemiesRemaining: number;
  /** Total allies in the run. */
  partySize: number;
  /** Allies still standing. */
  alive: number;
  /** Allies down (dead/awaiting revive). */
  down: number;
  /** Result-screen copy, or null while the run is still playing. */
  headline: string | null;
}

export function survivalSummary(world: SurvivalWorld): SurvivalSummary {
  const { run } = world;
  const players = Object.values(world.players);
  const alive = players.filter((p) => p.status === "alive").length;
  const wavesCleared =
    run.phase === "won"
      ? run.campaignLevels * run.wavesPerLevel
      : (run.level - 1) * run.wavesPerLevel + (run.wave - 1);

  let headline: string | null = null;
  if (world.outcome === "won") headline = "Campaign cleared!";
  else if (world.outcome === "lost") headline = `Wiped out — reached Level ${run.level}, Wave ${run.wave}`;

  return {
    phase: world.phase,
    outcome: world.outcome,
    level: run.level,
    wave: run.wave,
    wavesCleared,
    enemiesRemaining: world.enemies.filter((e) => e.status === "alive").length,
    partySize: players.length,
    alive,
    down: players.length - alive,
    headline,
  };
}

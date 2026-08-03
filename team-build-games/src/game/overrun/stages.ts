/**
 * Campaign stage structure (pure). The campaign is a finite run of `TOTAL_STAGES` stages; each stage
 * has a hand-authored wave count (`STAGE_WAVES`). Progression RESETS at each stage boundary (fresh
 * level 1 + pistol) and stages are separated by a comic beat — so each stage is a self-contained
 * escalation. Survival mode ignores all of this and runs endlessly.
 *
 * This increment ships the structure + the tank's Rush ability over the existing roster; dedicated
 * per-stage enemy pools, new kinds, and the stage-5 megaboss / boss finales land in a later increment.
 * `stageForWave` maps the sim's global 1-based `wave` counter onto (stage, waveInStage).
 */

/** Waves per 1-based stage. Hand-authored escalation-and-release shape (stage 5 = short megaboss run). */
export const STAGE_WAVES = [3, 5, 7, 5, 3, 10] as const;

export const TOTAL_STAGES = STAGE_WAVES.length;

/** Waves in a given 1-based stage (clamped to the table). */
export function wavesForStage(stage: number): number {
  return STAGE_WAVES[Math.max(1, Math.min(TOTAL_STAGES, stage)) - 1]!;
}

/** Total waves to clear the whole campaign (sum over all stages). */
export const CAMPAIGN_WAVES = Array.from({ length: TOTAL_STAGES }, (_, i) => wavesForStage(i + 1)).reduce(
  (a, b) => a + b,
  0,
);

export interface StagePosition {
  stage: number;
  /** 1-based wave index within the stage. */
  waveInStage: number;
  /** This wave is the last of its stage (a boss wave, once bosses exist). */
  isStageLast: boolean;
  /** This wave is the final wave of the final stage — clearing it wins the campaign. */
  isCampaignLast: boolean;
}

/** Map a global 1-based wave number onto its stage + position. Clamps past the end. */
export function stageForWave(wave: number): StagePosition {
  let acc = 0;
  for (let stage = 1; stage <= TOTAL_STAGES; stage++) {
    const w = wavesForStage(stage);
    if (wave <= acc + w) {
      return {
        stage,
        waveInStage: wave - acc,
        isStageLast: wave === acc + w,
        isCampaignLast: stage === TOTAL_STAGES && wave === acc + w,
      };
    }
    acc += w;
  }
  const last = wavesForStage(TOTAL_STAGES);
  return { stage: TOTAL_STAGES, waveInStage: last, isStageLast: true, isCampaignLast: true };
}

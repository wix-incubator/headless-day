import { describe, expect, it } from "vitest";
import { CAMPAIGN_WAVES, TOTAL_STAGES, stageForWave, wavesForStage } from "./stages";

describe("overrun stages", () => {
  it("waves per stage follow the hand-authored table", () => {
    expect([1, 2, 3, 4, 5, 6].map(wavesForStage)).toEqual([3, 5, 7, 5, 3, 10]);
  });

  it("CAMPAIGN_WAVES is the sum across all 6 stages", () => {
    expect(CAMPAIGN_WAVES).toBe(33);
    expect(TOTAL_STAGES).toBe(6);
  });

  it("maps global wave numbers onto (stage, waveInStage)", () => {
    expect(stageForWave(1)).toMatchObject({ stage: 1, waveInStage: 1, isStageLast: false });
    expect(stageForWave(3)).toMatchObject({ stage: 1, waveInStage: 3, isStageLast: true, isCampaignLast: false });
    expect(stageForWave(4)).toMatchObject({ stage: 2, waveInStage: 1 });
    expect(stageForWave(8)).toMatchObject({ stage: 2, waveInStage: 5, isStageLast: true, isCampaignLast: false });
    expect(stageForWave(9)).toMatchObject({ stage: 3, waveInStage: 1 });
    expect(stageForWave(23)).toMatchObject({ stage: 5, waveInStage: 3, isStageLast: true, isCampaignLast: false });
    expect(stageForWave(24)).toMatchObject({ stage: 6, waveInStage: 1 });
    expect(stageForWave(33)).toMatchObject({ stage: 6, waveInStage: 10, isStageLast: true, isCampaignLast: true });
  });

  it("clamps waves past the campaign end to the final stage", () => {
    expect(stageForWave(99)).toMatchObject({ stage: 6, isCampaignLast: true });
  });
});

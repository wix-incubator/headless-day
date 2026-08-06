import { describe, expect, it } from "vitest";
import { clearWave, createRun, wipe } from "./campaign";

describe("survival campaign run (pure level/wave/win/fail machine)", () => {
  it("starts at level 1, wave 1, active", () => {
    const r = createRun({ wavesPerLevel: 3, campaignLevels: 5 });
    expect(r).toMatchObject({ level: 1, wave: 1, phase: "active", endless: false });
  });

  it("clearWave advances within a level without levelling up", () => {
    const { run, leveled } = clearWave(createRun({ wavesPerLevel: 3, campaignLevels: 5 }));
    expect(run).toMatchObject({ level: 1, wave: 2 });
    expect(leveled).toBe(false);
  });

  it("clearing a level's last wave levels up and flags a revive point", () => {
    let r = createRun({ wavesPerLevel: 2, campaignLevels: 5 });
    r = clearWave(r).run; // → wave 2
    const { run, leveled } = clearWave(r); // last wave of level 1
    expect(run).toMatchObject({ level: 2, wave: 1 });
    expect(leveled).toBe(true);
  });

  it("clearing the final wave of the final campaign level WINS the run", () => {
    let r = createRun({ wavesPerLevel: 1, campaignLevels: 2 });
    r = clearWave(r).run; // level 1 done → level 2
    expect(r.level).toBe(2);
    const { run, leveled } = clearWave(r); // final wave of final level
    expect(run.phase).toBe("won");
    expect(leveled).toBe(true);
  });

  it("endless mode never wins — it keeps levelling past the campaign", () => {
    let r = createRun({ wavesPerLevel: 1, campaignLevels: 2, endless: true });
    r = clearWave(r).run; // level 2
    r = clearWave(r).run; // level 3 (past campaign)
    expect(r).toMatchObject({ phase: "active", level: 3, endless: true });
  });

  it("wipe fails the run, and clearing a finished run is a no-op", () => {
    const failed = wipe(createRun());
    expect(failed.phase).toBe("failed");
    expect(clearWave(failed)).toEqual({ run: failed, leveled: false });
  });
});

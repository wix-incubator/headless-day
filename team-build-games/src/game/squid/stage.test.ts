import { describe, expect, it } from "vitest";
import { coerceStageId, groundYAt, nextStageId, STAGES, stageById } from "./stage";

describe("stage", () => {
  it("stage defs: stage1 solid, stage2 has the 0.9 m gap", () => {
    expect(stageById("stage1").hole).toBeNull();
    expect(stageById("stage2").hole).toEqual({ x: 3, width: 0.9 });
  });

  it("stage1 ground is solid everywhere on the course", () => {
    const s = stageById("stage1");
    for (const x of [0, 2.9, 3.2, 3.5, 5]) expect(groundYAt(x, s)).toBe(0);
  });

  it("stage2 ground has no support only inside the 3.0–3.9 m hole", () => {
    const s = stageById("stage2");
    expect(groundYAt(2.99, s)).toBe(0);
    expect(groundYAt(3.0, s)).toBeNull();
    expect(groundYAt(3.45, s)).toBeNull();
    expect(groundYAt(3.9, s)).toBeNull();
    expect(groundYAt(3.91, s)).toBe(0);
  });

  it("coerceStageId falls back to stage1 on garbage", () => {
    expect(coerceStageId("stage2")).toBe("stage2");
    expect(coerceStageId("nope")).toBe("stage1");
    expect(coerceStageId(42)).toBe("stage1");
    expect(coerceStageId(undefined)).toBe("stage1");
  });

  it("nextStageId chains stage1 → stage2 → null", () => {
    expect(nextStageId("stage1")).toBe("stage2");
    expect(nextStageId("stage2")).toBeNull();
  });
});

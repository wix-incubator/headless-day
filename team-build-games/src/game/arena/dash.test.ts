import { describe, expect, it } from "vitest";
import {
  consumeDashDistance,
  dashCooldownFraction,
  dashSpeedMultiplier,
  initialDash,
  tickDashCooldown,
  tryStartDash,
} from "./dash";
import { DASH_COOLDOWN_S, DASH_DIST_M, DASH_MULT } from "../constants";

describe("initialDash", () => {
  it("starts ready: not dashing, cooldown 0, fraction 1", () => {
    const d = initialDash();
    expect(d.dashing).toBe(false);
    expect(d.cooldownRemaining).toBe(0);
    expect(dashCooldownFraction(d)).toBe(1);
  });
});

describe("dash tuning", () => {
  it("recharges 15% faster than the original 3-second cooldown", () => {
    expect(DASH_COOLDOWN_S).toBeCloseTo(3 * 0.85, 5);
  });
});

describe("tryStartDash", () => {
  it("starts a dash when ready", () => {
    const d = tryStartDash(initialDash());
    expect(d.dashing).toBe(true);
    expect(d.distRemaining).toBe(DASH_DIST_M);
    expect(d.cooldownRemaining).toBe(DASH_COOLDOWN_S);
  });

  it("does nothing while on cooldown", () => {
    const onCd = { cooldownRemaining: 1.5, dashing: false, distRemaining: 0 };
    expect(tryStartDash(onCd)).toEqual(onCd);
  });

  it("does nothing while already dashing", () => {
    const dashing = { cooldownRemaining: 3, dashing: true, distRemaining: 1 };
    expect(tryStartDash(dashing)).toEqual(dashing);
  });
});

describe("tickDashCooldown", () => {
  it("counts the cooldown down and floors at 0", () => {
    expect(
      tickDashCooldown(
        { cooldownRemaining: 1, dashing: false, distRemaining: 0 },
        0.4,
      ),
    ).toMatchObject({ cooldownRemaining: 0.6 });
    expect(
      tickDashCooldown(
        { cooldownRemaining: 0.2, dashing: false, distRemaining: 0 },
        1,
      ),
    ).toMatchObject({ cooldownRemaining: 0 });
  });
});

describe("consumeDashDistance", () => {
  it("subtracts traveled distance and ends the dash when spent", () => {
    const mid = consumeDashDistance(
      { cooldownRemaining: 3, dashing: true, distRemaining: 2 },
      0.5,
    );
    expect(mid).toMatchObject({ dashing: true, distRemaining: 1.5 });
    const done = consumeDashDistance(
      { cooldownRemaining: 3, dashing: true, distRemaining: 0.3 },
      0.5,
    );
    expect(done).toMatchObject({ dashing: false, distRemaining: 0 });
  });

  it("is a no-op when not dashing", () => {
    const idle = { cooldownRemaining: 0, dashing: false, distRemaining: 0 };
    expect(consumeDashDistance(idle, 5)).toEqual(idle);
  });
});

describe("dashSpeedMultiplier", () => {
  it("is the dash multiplier while dashing, 1 otherwise", () => {
    expect(
      dashSpeedMultiplier({
        cooldownRemaining: 3,
        dashing: true,
        distRemaining: 1,
      }),
    ).toBe(DASH_MULT);
    expect(dashSpeedMultiplier(initialDash())).toBe(1);
  });
});

describe("dashCooldownFraction", () => {
  it("is 0 right after use and 1 when recharged", () => {
    expect(
      dashCooldownFraction({
        cooldownRemaining: DASH_COOLDOWN_S,
        dashing: true,
        distRemaining: 2,
      }),
    ).toBe(0);
    expect(
      dashCooldownFraction({
        cooldownRemaining: DASH_COOLDOWN_S / 2,
        dashing: false,
        distRemaining: 0,
      }),
    ).toBeCloseTo(0.5, 5);
    expect(
      dashCooldownFraction({
        cooldownRemaining: 0,
        dashing: false,
        distRemaining: 0,
      }),
    ).toBe(1);
  });
});

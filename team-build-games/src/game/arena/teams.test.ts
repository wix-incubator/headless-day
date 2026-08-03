import { describe, expect, it } from "vitest";
import { assignPlayer, autoBalance, isBalanced, isTeamMatchOver, teamSizes, teamWinner, TEAMS } from "./teams";

describe("Team Versus — team assignment + balance", () => {
  it("has two named teams", () => {
    expect(TEAMS.map((t) => t.name)).toEqual(["Red", "Blue"]);
  });

  it("autoBalance splits players evenly and deterministically (sorted round-robin)", () => {
    const a = autoBalance(["p2", "p1", "p4", "p3"], 2);
    expect(a).toEqual({ p1: 0, p2: 1, p3: 0, p4: 1 });
    expect(autoBalance(["p4", "p3", "p2", "p1"], 2)).toEqual(a); // order-independent
    expect(teamSizes(a, 2)).toEqual([2, 2]);
  });

  it("autoBalance keeps odd rosters balanced (sizes differ by ≤1)", () => {
    const a = autoBalance(["a", "b", "c", "d", "e"], 2);
    expect(teamSizes(a, 2)).toEqual([3, 2]);
    expect(isBalanced(a, 2)).toBe(true);
  });

  it("assignPlayer moves a player to a team (clamped to a valid team)", () => {
    expect(assignPlayer({ a: 0, b: 1 }, "a", 1)).toEqual({ a: 1, b: 1 });
    expect(assignPlayer({ a: 0 }, "a", 9, 2).a).toBe(1); // clamped to last team
    expect(isBalanced({ a: 0, b: 0, c: 0 }, 2)).toBe(false); // 3 vs 0
  });
});

describe("Team Versus — win detection (last team standing)", () => {
  const asn = { a: 0, b: 0, c: 1, d: 1 }; // Red: a,b — Blue: c,d

  it("declares the sole surviving team the winner", () => {
    expect(teamWinner(asn, ["a", "b"])).toBe(0); // Blue wiped → Red wins
    expect(teamWinner(asn, ["c"])).toBe(1); // Red wiped → Blue wins
  });

  it("has no winner while ≥2 teams are alive, and is a draw when all are dead", () => {
    expect(teamWinner(asn, ["a", "c"])).toBeNull();
    expect(teamWinner(asn, [])).toBeNull();
  });

  it("isTeamMatchOver is true when ≤1 team survives", () => {
    expect(isTeamMatchOver(asn, ["a", "c"])).toBe(false);
    expect(isTeamMatchOver(asn, ["a", "b"])).toBe(true);
    expect(isTeamMatchOver(asn, [])).toBe(true); // mutual wipe → over (draw)
  });
});

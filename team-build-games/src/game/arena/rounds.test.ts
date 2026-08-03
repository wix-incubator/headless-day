import { describe, expect, it } from "vitest";
import { createRounds, nextRound, recordRoundWin, recordTiebreakWin, standings } from "./rounds";

const podiumIds = (state: ReturnType<typeof createRounds>) =>
  standings(state).map((p) => ({ place: p.place, players: p.players }));

describe("rounds — regular best-of-N", () => {
  it("starts at round 0 with everyone on zero wins", () => {
    const s = createRounds(["a", "b"], 3);
    expect(s.index).toBe(0);
    expect(nextRound(s)).toEqual({ kind: "play", roundNumber: 1 });
  });

  it("plays exactly N rounds, advancing the round number each time", () => {
    let s = createRounds(["a", "b"], 3);
    s = recordRoundWin(s, "a");
    expect(nextRound(s)).toEqual({ kind: "play", roundNumber: 2 });
    s = recordRoundWin(s, "b");
    expect(nextRound(s)).toEqual({ kind: "play", roundNumber: 3 });
  });

  it("ends with a clean podium when win counts are distinct", () => {
    let s = createRounds(["a", "b"], 3);
    s = recordRoundWin(s, "a");
    s = recordRoundWin(s, "a");
    s = recordRoundWin(s, "b");
    const nxt = nextRound(s);
    expect(nxt.kind).toBe("done");
    expect(podiumIds(s)).toEqual([
      { place: 1, players: ["a"] },
      { place: 2, players: ["b"] },
    ]);
  });

  it("a drawn round (null winner) still counts toward N but awards no win", () => {
    let s = createRounds(["a", "b"], 1);
    s = recordRoundWin(s, null);
    expect(s.index).toBe(1);
    expect(s.wins.a).toBe(0);
    expect(s.wins.b).toBe(0);
    // both tied for 1st with 0 wins → sudden death for the podium
    expect(nextRound(s)).toEqual({ kind: "tiebreak", players: ["a", "b"], place: 1 });
  });
});

describe("rounds — sudden-death tie-breaks for podium places", () => {
  it("breaks a two-way tie for 1st, then finishes", () => {
    let s = createRounds(["a", "b"], 2);
    s = recordRoundWin(s, "a");
    s = recordRoundWin(s, "b"); // 1-1
    expect(nextRound(s)).toEqual({ kind: "tiebreak", players: ["a", "b"], place: 1 });
    s = recordTiebreakWin(s, "b"); // b wins the decider
    expect(nextRound(s).kind).toBe("done");
    expect(podiumIds(s)).toEqual([
      { place: 1, players: ["b"] },
      { place: 2, players: ["a"] },
    ]);
  });

  it("resolves a 3-way tie for 2nd/3rd top-down, one place per sudden-death", () => {
    // best-of-1, 3 players: a wins the only round; b,c tie at 0 for 2nd.
    let s = createRounds(["a", "b", "c"], 1);
    s = recordRoundWin(s, "a");
    const t1 = nextRound(s);
    expect(t1).toEqual({ kind: "tiebreak", players: ["b", "c"], place: 2 });
    s = recordTiebreakWin(s, "c"); // c takes 2nd
    expect(nextRound(s).kind).toBe("done");
    expect(podiumIds(s)).toEqual([
      { place: 1, players: ["a"] },
      { place: 2, players: ["c"] },
      { place: 3, players: ["b"] },
    ]);
  });

  it("does NOT break ties that fall entirely off the podium (place > 3)", () => {
    // best-of-1, 5 players: a wins; b,c,d,e tie at 0.
    let s = createRounds(["a", "b", "c", "d", "e"], 1);
    s = recordRoundWin(s, "a");
    // 2nd is contested first
    expect(nextRound(s)).toEqual({ kind: "tiebreak", players: ["b", "c", "d", "e"], place: 2 });
    s = recordTiebreakWin(s, "b"); // b → 2nd
    expect(nextRound(s)).toEqual({ kind: "tiebreak", players: ["c", "d", "e"], place: 3 });
    s = recordTiebreakWin(s, "c"); // c → 3rd; d,e tie for 4th → off podium, no break
    expect(nextRound(s).kind).toBe("done");
    expect(podiumIds(s)).toEqual([
      { place: 1, players: ["a"] },
      { place: 2, players: ["b"] },
      { place: 3, players: ["c"] },
      { place: 4, players: ["d", "e"] },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { isFull, joinedIds, lobbyHost, remove, rosterList, upsert, type Roster } from "./lobby";

const p = (id: string, name = id) => ({ id, name, shape: "circle" as const, weapon: "sword" as const });

describe("lobby roster", () => {
  it("adds, updates, and removes players", () => {
    let r: Roster = {};
    r = upsert(r, p("b", "Bee"));
    r = upsert(r, p("a", "Ay"));
    expect(rosterList(r).map((x) => x.id)).toEqual(["a", "b"]); // sorted by id
    r = upsert(r, p("b", "Beatrice")); // update
    expect(r.b.name).toBe("Beatrice");
    r = remove(r, "a");
    expect(Object.keys(r)).toEqual(["b"]);
  });

  it("host is the lowest id", () => {
    const r = upsert(upsert(upsert({}, p("c")), p("a")), p("b"));
    expect(lobbyHost(r)).toBe("a");
    expect(lobbyHost({})).toBeNull();
  });

  it("refuses new players once full but still allows updates", () => {
    let r: Roster = {};
    for (let i = 0; i < 8; i++) r = upsert(r, p(`p${i}`));
    expect(isFull(r)).toBe(true);
    r = upsert(r, p("overflow"));
    expect("overflow" in r).toBe(false); // rejected
    r = upsert(r, p("p0", "renamed")); // update of existing is fine
    expect(r.p0.name).toBe("renamed");
  });
});

describe("joinedIds (new-remote detection for the connect sound)", () => {
  it("returns ids present in next but not prev", () => {
    expect(joinedIds(["me", "a"], ["me", "a", "b"], "me")).toEqual(["b"]);
  });

  it("excludes self, so joining your own room is silent", () => {
    expect(joinedIds([], ["me"], "me")).toEqual([]);
  });

  it("returns every new remote when several appear at once", () => {
    expect(joinedIds(["me"], ["me", "a", "b"], "me")).toEqual(["a", "b"]);
  });

  it("is empty when nobody new joined (renames/leaves don't count)", () => {
    expect(joinedIds(["me", "a"], ["me", "a"], "me")).toEqual([]);
    expect(joinedIds(["me", "a", "b"], ["me", "a"], "me")).toEqual([]);
  });
});

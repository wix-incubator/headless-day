import { describe, expect, it } from "vitest";
import { rollDrop } from "./drops";
import { MAX_PICKUPS, PICKUP_TTL_S, PITY_LIMIT } from "./constants";
import type { DroppableGun, Enemy } from "./types";

const enemy = (id = "e5"): Enemy => ({ id, kind: "rusher", pos: { x: 3, y: 4 }, health: 0, attackCooldown: 0, stunRemaining: 0 });
const POOL: DroppableGun[] = ["shotgun", "rifle"];

describe("rollDrop", () => {
  it("is deterministic and reproducible for the same coordinates", () => {
    const a = rollDrop(42, 100, enemy(), 0, 0, POOL);
    expect(rollDrop(42, 100, enemy(), 0, 0, POOL)).toEqual(a);
  });

  it("drops land at the enemy's position with a deterministic id + ttl, and reset pity", () => {
    // scan ticks until a drop occurs (base rate 16%) — bounded scan keeps the test fast
    for (let t = 0; t < 200; t++) {
      const r = rollDrop(1, t, enemy("e9"), 0, 0, POOL);
      if (r.pickup) {
        expect(r.pickup).toMatchObject({ id: "pk:e9", pos: { x: 3, y: 4 }, ttl: PICKUP_TTL_S });
        expect(["shotgun", "rifle", "medkit"]).toContain(r.pickup.kind);
        expect(r.pity).toBe(0);
        return;
      }
      expect(r.pity).toBe(1);
    }
    throw new Error("no drop in 200 ticks — weights broken");
  });

  it("only drops guns from the supplied pool", () => {
    const soloPool: DroppableGun[] = ["shotgun"];
    for (let t = 0; t < 400; t++) {
      const r = rollDrop(5, t, enemy(`e${t}`), 0, 0, soloPool);
      if (r.pickup && r.pickup.kind !== "medkit") expect(r.pickup.kind).toBe("shotgun");
    }
  });

  it("roughly matches the configured rates over many draws", () => {
    let weapons = 0, medkits = 0;
    for (let t = 0; t < 2000; t++) {
      const r = rollDrop(7, t, enemy(`e${t}`), 0, 0, POOL);
      if (r.pickup?.kind === "medkit") medkits++;
      else if (r.pickup) weapons++;
    }
    expect(weapons / 2000).toBeGreaterThan(0.06);
    expect(weapons / 2000).toBeLessThan(0.14);
    expect(medkits / 2000).toBeGreaterThan(0.03);
    expect(medkits / 2000).toBeLessThan(0.09);
  });

  it("pity forces a drop at the limit", () => {
    // find coordinates that would NOT drop naturally, then apply pity pressure
    let t = 0;
    while (rollDrop(3, t, enemy(), 0, 0, POOL).pickup) t++;
    const forced = rollDrop(3, t, enemy(), 0, PITY_LIMIT - 1, POOL);
    expect(forced.pickup).not.toBeNull();
    expect(forced.pity).toBe(0);
  });

  it("never drops past the live-pickup cap (and still counts pity)", () => {
    const r = rollDrop(1, 0, enemy(), MAX_PICKUPS, PITY_LIMIT - 1, POOL);
    expect(r.pickup).toBeNull();
    expect(r.pity).toBe(PITY_LIMIT);
  });
});

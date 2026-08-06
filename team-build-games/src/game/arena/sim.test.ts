import { describe, expect, it } from "vitest";
import { stepWorld } from "./sim";
import { createWorld } from "./match";
import { dashCooldownFraction } from "./dash";
import {
  ATTACK_COOLDOWN_S,
  ATTACK_TTL_S,
  DASH_COOLDOWN_S,
  DASH_DIST_M,
  FIELD_M,
  FIGURE_RADIUS_M,
  KNOCKBACK_M,
  RUN_SPEED_MS,
  START_HEALTH,
} from "../constants";
import type { Intent, InputState } from "./types";

const NONE: InputState = { up: false, down: false, left: false, right: false };
const idle = (facing: Intent["facing"] = "down"): Intent => ({
  move: NONE,
  facing,
  dash: false,
  attack: false,
  block: false,
});
const moveRight: Intent = {
  move: { ...NONE, right: true },
  facing: "right",
  dash: false,
  attack: false,
  block: false,
};

describe("stepWorld — movement", () => {
  it("moves a player at run speed in the input direction", () => {
    const w = createWorld([{ id: "A", pos: { x: 15, y: 15 } }]);
    const next = stepWorld(w, { A: moveRight }, 0.1);
    expect(next.players.A.pos.x).toBeCloseTo(15 + RUN_SPEED_MS * 0.1, 5);
    expect(next.players.A.pos.y).toBeCloseTo(15, 5);
    expect(next.tick).toBe(1);
  });

  it("leaves a player with no intent where they are", () => {
    const w = createWorld([{ id: "A", pos: { x: 5, y: 6 } }]);
    const next = stepWorld(w, {}, 0.1);
    expect(next.players.A.pos).toEqual({ x: 5, y: 6 });
  });

  it("does not simulate unless the phase is 'playing'", () => {
    const w = createWorld([{ id: "A", pos: { x: 5, y: 5 } }], "countdown");
    expect(stepWorld(w, { A: moveRight }, 0.1)).toBe(w);
  });
});

describe("stepWorld — dash", () => {
  it("moves at dash speed and puts dash on cooldown", () => {
    const w = createWorld([{ id: "A", pos: { x: 10, y: 15 } }]);
    const dashRight: Intent = { ...moveRight, dash: true };
    const next = stepWorld(w, { A: dashRight }, 0.1);
    // 4× run speed over 0.1s = 1.6m (< the 2m burst)
    expect(next.players.A.pos.x).toBeCloseTo(10 + RUN_SPEED_MS * 4 * 0.1, 5);
    expect(next.players.A.dash.dashing).toBe(true);
    expect(next.players.A.dash.cooldownRemaining).toBe(DASH_COOLDOWN_S);
  });

  // A second, far-away idle player keeps the match in "playing" (a 1-player world ends instantly).
  const BYSTANDER = { id: "Z", pos: { x: 1, y: 1 } };

  // run a dash to completion and return total distance travelled
  function totalDashTravel(dt: number): number {
    let w = createWorld([{ id: "A", pos: { x: 5, y: 15 } }, BYSTANDER]);
    w = stepWorld(w, { A: { ...moveRight, dash: true } }, dt);
    let guard = 0;
    while (w.players.A.dash.dashing && guard++ < 1000) {
      w = stepWorld(w, { A: moveRight }, dt);
    }
    return w.players.A.pos.x - 5;
  }

  it("travels exactly the 2m burst, independent of dt", () => {
    expect(totalDashTravel(0.1)).toBeCloseTo(DASH_DIST_M, 5);
    expect(totalDashTravel(0.05)).toBeCloseTo(DASH_DIST_M, 5);
    expect(totalDashTravel(1 / 60)).toBeCloseTo(DASH_DIST_M, 5);
  });

  it("ends the dash when blocked by a wall (no permanent dashing / 4x speed)", () => {
    let w = createWorld([
      { id: "A", pos: { x: FIELD_M - FIGURE_RADIUS_M - 0.5, y: 15 } },
      BYSTANDER,
    ]);
    w = stepWorld(w, { A: { ...moveRight, dash: true } }, 0.1);
    let guard = 0;
    while (w.players.A.dash.dashing && guard++ < 100) {
      w = stepWorld(w, { A: moveRight }, 0.1);
    }
    expect(w.players.A.dash.dashing).toBe(false); // terminated, not frozen
    expect(guard).toBeLessThan(100);
    expect(w.players.A.pos.x).toBeCloseTo(FIELD_M - FIGURE_RADIUS_M, 5); // pinned at wall
  });

  it("recharges over the cooldown and allows a second dash", () => {
    let w = createWorld([{ id: "A", pos: { x: 15, y: 15 } }, BYSTANDER]);
    w = stepWorld(w, { A: { ...moveRight, dash: true } }, 0.1);
    // idle long enough to recharge (one big dt past the cooldown)
    w = stepWorld(w, {}, DASH_COOLDOWN_S + 1);
    expect(w.players.A.dash.cooldownRemaining).toBe(0);
    expect(dashCooldownFraction(w.players.A.dash)).toBe(1);
    // a fresh dash edge starts a new burst
    const after = stepWorld(w, { A: { ...moveRight, dash: true } }, 0.1);
    expect(after.players.A.dash.dashing).toBe(true);
    expect(after.players.A.dash.cooldownRemaining).toBe(DASH_COOLDOWN_S);
  });
});

describe("stepWorld — combat & death", () => {
  it("an attack removes exactly 1 health, only on the initiation tick", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.5, y: 15 } },
    ]);
    const attack: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const after1 = stepWorld(w, { A: attack, B: idle() }, 0.05);
    expect(after1.players.B.health).toBe(START_HEALTH - 1);
    // next tick A holds nothing → no further damage
    const after2 = stepWorld(after1, { A: idle("right"), B: idle() }, 0.05);
    expect(after2.players.B.health).toBe(START_HEALTH - 1);
  });

  it("kills a player at 1 health and ends the match with the survivor as winner", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.5, y: 15 } },
    ]);
    w.players.B.health = 1;
    const attack: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const next = stepWorld(w, { A: attack, B: idle() }, 0.05);
    expect(next.players.B.status).toBe("dead");
    expect(next.phase).toBe("ended");
    expect(next.winnerId).toBe("A");
  });

  it("does not end the match while more than one player is alive", () => {
    const w = createWorld([
      { id: "A", pos: { x: 1, y: 1 } },
      { id: "B", pos: { x: 20, y: 20 } },
      { id: "C", pos: { x: 5, y: 25 } },
    ]);
    const next = stepWorld(w, {}, 0.05);
    expect(next.phase).toBe("playing");
    expect(next.winnerId).toBeNull();
  });

  it("one swing can damage two players in a single tick", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.4, y: 15 } },
      { id: "C", pos: { x: 15.5, y: 15.2 } },
    ]);
    const attack: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const next = stepWorld(w, { A: attack, B: idle(), C: idle() }, 0.05);
    expect(next.players.B.health).toBe(START_HEALTH - 1);
    expect(next.players.C.health).toBe(START_HEALTH - 1);
  });

  it("enforces a 1s cooldown between attacks", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "Z", pos: { x: 1, y: 1 } }, // bystander keeps match playing
    ]);
    const atk: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const s1 = stepWorld(w, { A: atk }, 0.05);
    expect(s1.players.A.attackCooldownRemaining).toBeCloseTo(
      ATTACK_COOLDOWN_S,
      5,
    );
    expect(s1.players.A.attack?.ttl).toBeCloseTo(ATTACK_TTL_S, 5);
    // re-pressing attack during cooldown does NOT start a new swing (ttl keeps decaying)
    const s2 = stepWorld(s1, { A: atk }, 0.05);
    expect(s2.players.A.attackCooldownRemaining).toBeCloseTo(
      ATTACK_COOLDOWN_S - 0.05,
      5,
    );
    expect(s2.players.A.attack?.ttl).toBeCloseTo(ATTACK_TTL_S - 0.05, 5);
    // after the cooldown elapses, a new swing fires (ttl reset, cooldown reset)
    const s3 = stepWorld(
      s2,
      { A: { ...atk, attack: false } },
      ATTACK_COOLDOWN_S,
    );
    expect(s3.players.A.attackCooldownRemaining).toBe(0);
    const s4 = stepWorld(s3, { A: atk }, 0.05);
    expect(s4.players.A.attack?.ttl).toBeCloseTo(ATTACK_TTL_S, 5);
    expect(s4.players.A.attackCooldownRemaining).toBeCloseTo(
      ATTACK_COOLDOWN_S,
      5,
    );
  });

  it("attacks along the free-aim angle, independent of movement facing", () => {
    // A faces 'right' (body) but aims down-right at B, who is NOT on the facing axis.
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.6, y: 15.6 } },
      { id: "Z", pos: { x: 1, y: 1 } }, // bystander keeps match playing
    ]);
    const attack: Intent = {
      move: NONE,
      facing: "right",
      aim: Math.PI / 4,
      dash: false,
      attack: true,
      block: false,
    };
    const after = stepWorld(w, { A: attack, B: idle(), Z: idle() }, 0.05);
    expect(after.players.B.health).toBe(START_HEALTH - 1); // hit despite facing 'right'
    expect(after.players.A.facing).toBe("right"); // body still faces movement
    expect(after.players.A.attack?.aim).toBeCloseTo(Math.PI / 4, 5); // swing locked to aim
  });

  it("uses the attacker's weapon reach — spear reaches farther, knife shorter", () => {
    // target 3m to the right: a spear (reach 3.5) connects, but a knife (reach 1) cannot.
    const world = (weapon: "spear" | "knife") =>
      createWorld([
        { id: "A", pos: { x: 10, y: 15 }, facing: "right", weapon },
        { id: "B", pos: { x: 13, y: 15 } },
        { id: "Z", pos: { x: 1, y: 1 } },
      ]);
    const atk: Intent = {
      move: NONE,
      facing: "right",
      aim: 0,
      dash: false,
      attack: true,
      block: false,
    };
    expect(stepWorld(world("spear"), { A: atk }, 0.05).players.B.health).toBe(
      START_HEALTH - 1,
    );
    expect(stepWorld(world("knife"), { A: atk }, 0.05).players.B.health).toBe(
      START_HEALTH,
    );
  });

  it("knocks the victim KNOCKBACK_M away from the attacker on a hit", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.5, y: 15 } },
    ]);
    const atk: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const s = stepWorld(w, { A: atk, B: idle() }, 0.05);
    expect(s.players.B.health).toBe(START_HEALTH - 1);
    expect(s.players.B.pos.x).toBeCloseTo(15.5 + KNOCKBACK_M, 5); // pushed away (+x)
    expect(s.players.B.pos.y).toBeCloseTo(15, 5);
  });

  it("clamps knockback at the field wall", () => {
    const w = createWorld([
      { id: "A", pos: { x: FIELD_M - 1.4, y: 15 }, facing: "right" },
      { id: "B", pos: { x: FIELD_M - 0.6, y: 15 } }, // 0.8m ahead, near the wall
    ]);
    const atk: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const s = stepWorld(w, { A: atk, B: idle() }, 0.05);
    // +1m knockback would overshoot the wall → clamped to field - radius
    expect(s.players.B.pos.x).toBeCloseTo(FIELD_M - FIGURE_RADIUS_M, 5);
  });

  it("a mutual kill ends the match with no winner (0 alive → null)", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 15.5, y: 15 }, facing: "left" },
    ]);
    w.players.A.health = 1;
    w.players.B.health = 1;
    const aAtk: Intent = {
      move: NONE,
      facing: "right",
      dash: false,
      attack: true,
      block: false,
    };
    const bAtk: Intent = {
      move: NONE,
      facing: "left",
      dash: false,
      attack: true,
      block: false,
    };
    const next = stepWorld(w, { A: aAtk, B: bAtk }, 0.05);
    expect(next.players.A.status).toBe("dead");
    expect(next.players.B.status).toBe("dead");
    expect(next.phase).toBe("ended");
    expect(next.winnerId).toBeNull();
  });
});

describe("stepWorld — ranged (bow) projectiles", () => {
  const bowAtk: Intent = {
    move: NONE,
    facing: "right",
    aim: 0,
    dash: false,
    attack: true,
    block: false,
  };

  it("looses a traveling arrow instead of a melee hit, and puts the bow on cooldown", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right", weapon: "bow" },
      { id: "B", pos: { x: 25, y: 15 } }, // far down-range — not hit this tick
    ]);
    const after = stepWorld(w, { A: bowAtk, B: idle() }, 0.05);
    expect(after.projectiles.length).toBe(1); // arrow spawned, still flying
    expect(after.players.B.health).toBe(START_HEALTH); // no instant/melee damage
    expect(after.players.A.attackCooldownRemaining).toBeGreaterThan(0);
  });

  it("an arrow that reaches a player deals 1 damage and is consumed", () => {
    let w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, facing: "right", weapon: "bow" },
      { id: "B", pos: { x: 18, y: 15 } }, // 3 m down-range
    ]);
    w = stepWorld(w, { A: bowAtk, B: idle() }, 0.05);
    let guard = 0;
    while (w.projectiles.length > 0 && guard++ < 50) {
      w = stepWorld(w, { A: idle("right"), B: idle() }, 0.05);
    }
    expect(w.players.B.health).toBe(START_HEALTH - 1);
    expect(w.projectiles.length).toBe(0); // arrow consumed on hit
  });

  it("an arrow expires at its range without hitting anyone", () => {
    let w = createWorld([
      { id: "A", pos: { x: 2, y: 15 }, facing: "right", weapon: "bow" },
      { id: "Z", pos: { x: 2, y: 1 } }, // off the flight path
    ]);
    w = stepWorld(w, { A: bowAtk, Z: idle() }, 0.05);
    let guard = 0;
    while (w.projectiles.length > 0 && guard++ < 100) {
      w = stepWorld(w, { A: idle("right"), Z: idle() }, 0.05);
    }
    expect(w.projectiles.length).toBe(0); // gone (range/wall), not stuck
    expect(w.players.Z.health).toBe(START_HEALTH); // nobody hit
  });
});

describe("stepWorld — premium weapon waves", () => {
  const attackRight: Intent = {
    move: NONE,
    facing: "right",
    aim: 0,
    dash: false,
    attack: true,
    block: false,
  };

  it("launches a 1 m-diameter katana wave that pierces targets across its 10 m path", () => {
    let w = createWorld([
      { id: "A", pos: { x: 5, y: 15 }, weapon: "katana" },
      { id: "B", pos: { x: 9, y: 15 } },
      { id: "C", pos: { x: 14.7, y: 15 } },
      { id: "D", pos: { x: 17, y: 15 } },
      { id: "Z", pos: { x: 2, y: 2 } },
    ]);
    w = stepWorld(w, { A: attackRight }, 0.05);
    expect(w.projectiles[0]).toMatchObject({
      kind: "crushing-wave",
      radius: 0.5,
    });
    for (let i = 0; i < 30 && w.projectiles.length > 0; i += 1) {
      w = stepWorld(w, {}, 0.05);
    }
    expect(w.players.B.health).toBe(START_HEALTH - 1);
    expect(w.players.C.health).toBe(START_HEALTH - 1);
    expect(w.players.D.health).toBe(START_HEALTH);
    expect(w.players.A.stats.hits).toBe(1);
  });

  it("expands the hammer wave to 3 m in every direction and no farther", () => {
    let w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, weapon: "solar-hammer" },
      { id: "east", pos: { x: 17.8, y: 15 } },
      { id: "north", pos: { x: 15, y: 12.2 } },
      { id: "far", pos: { x: 19.2, y: 15 } },
    ]);
    w = stepWorld(w, { A: attackRight }, 0.05);
    expect(w.projectiles[0]?.kind).toBe("solar-wave");
    for (let i = 0; i < 10 && w.projectiles.length > 0; i += 1) {
      w = stepWorld(w, {}, 0.05);
    }
    expect(w.players.east.health).toBe(START_HEALTH - 1);
    expect(w.players.north.health).toBe(START_HEALTH - 1);
    expect(w.players.far.health).toBe(START_HEALTH);
    expect(w.players.A.stats.hits).toBe(1);
  });
});

describe("stepWorld — lifecycle invariants", () => {
  it("is a no-op once the match has ended (returns the same world)", () => {
    const ended = createWorld([{ id: "A", pos: { x: 15, y: 15 } }], "ended");
    expect(stepWorld(ended, { A: moveRight }, 0.1)).toBe(ended);
  });

  it("keeps an idle player's facing, and adopts an explicit intent's facing", () => {
    const w = createWorld([
      { id: "A", pos: { x: 5, y: 6 }, facing: "right" },
      { id: "Z", pos: { x: 1, y: 1 } }, // bystander keeps the match playing
    ]);
    const kept = stepWorld(w, {}, 0.1);
    expect(kept.players.A.facing).toBe("right");
    const turned = stepWorld(
      w,
      {
        A: {
          move: { ...NONE, left: true },
          facing: "left",
          dash: false,
          attack: false,
          block: false,
        },
      },
      0.1,
    );
    expect(turned.players.A.facing).toBe("left");
  });
});

describe("stepWorld — per-player stats (hits / misses / distance)", () => {
  const attack = (aim: number): Intent => ({
    move: NONE,
    facing: "right",
    aim,
    dash: false,
    attack: true,
    block: false,
  });

  it("starts everyone at zero and accumulates distance for movers only", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 } },
      { id: "B", pos: { x: 5, y: 5 } },
    ]);
    expect(w.players.A.stats).toEqual({ hits: 0, misses: 0, distance: 0 });
    const n = stepWorld(w, { A: moveRight }, 0.1);
    expect(n.players.A.stats.distance).toBeCloseTo(RUN_SPEED_MS * 0.1, 5);
    expect(n.players.B.stats.distance).toBe(0);
    expect(n.players.A.stats.hits).toBe(0);
  });

  it("counts a melee swing that connects as a hit", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 } },
      { id: "B", pos: { x: 16, y: 15 } },
    ]);
    const n = stepWorld(w, { A: attack(0) }, 0.05); // aim +x (right); B is 1m right, within reach
    expect(n.players.A.stats.hits).toBe(1);
    expect(n.players.A.stats.misses).toBe(0);
    expect(n.players.B.health).toBe(START_HEALTH - 1);
  });

  it("counts a melee swing that hits nobody as a miss", () => {
    const w = createWorld([
      { id: "A", pos: { x: 15, y: 15 } },
      { id: "B", pos: { x: 15, y: 11 } },
    ]);
    const n = stepWorld(w, { A: attack(0) }, 0.05); // aim right; B is straight up → outside the cone
    expect(n.players.A.stats.misses).toBe(1);
    expect(n.players.A.stats.hits).toBe(0);
    expect(n.players.B.health).toBe(START_HEALTH);
  });

  it("credits a bow hit to the shooter when the arrow connects", () => {
    let w = createWorld([
      { id: "A", pos: { x: 8, y: 15 }, weapon: "bow" },
      { id: "B", pos: { x: 18, y: 15 } },
    ]);
    w = stepWorld(w, { A: attack(0) }, 0.05); // fire toward +x; B is 10m right
    expect(w.players.A.stats.hits).toBe(0); // not counted at fire time
    for (
      let i = 0;
      i < 40 && w.players.A.stats.hits === 0 && w.phase === "playing";
      i++
    )
      w = stepWorld(w, {}, 0.05);
    expect(w.players.A.stats.hits).toBe(1);
  });

  it("counts a bow arrow that expires without hitting as a miss", () => {
    let w = createWorld([
      { id: "A", pos: { x: 15, y: 15 }, weapon: "bow" },
      { id: "B", pos: { x: 2, y: 2 } },
    ]);
    w = stepWorld(w, { A: attack(0) }, 0.05); // fire toward +x; nobody in the path
    for (
      let i = 0;
      i < 60 && w.players.A.stats.misses === 0 && w.phase === "playing";
      i++
    )
      w = stepWorld(w, {}, 0.05);
    expect(w.players.A.stats.misses).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { advanceProjectile, projectileTarget, spawnArrow } from "./projectile";
import { initialDash } from "./dash";
import { directionAngle } from "./logic";
import { FIGURE_RADIUS_M } from "../constants";
import type { PlayerState, Vec2 } from "./types";

const player = (
  id: string,
  pos: Vec2,
  status: PlayerState["status"] = "alive",
): PlayerState => ({
  id,
  pos,
  facing: "right",
  aim: directionAngle("right"),
  weapon: "bow",
  health: 3,
  status,
  dash: initialDash(),
  attack: null,
  attackCooldownRemaining: 0,
  block: null,
  blockCooldownRemaining: 0,
  blockImpactSeq: 0,
  stats: { hits: 0, misses: 0, distance: 0 },
});

describe("spawnArrow", () => {
  it("launches from the owner along the aim at the given speed, with a deterministic id", () => {
    const p = spawnArrow({
      ownerId: "A",
      pos: { x: 5, y: 5 },
      aim: 0,
      tick: 7,
      speed: 14,
      range: 16,
      damage: 1,
      knockback: 0.5,
    });
    expect(p.id).toBe("A#7"); // owner#tick — unique per shot (fire rate is cooldown-gated)
    expect(p.ownerId).toBe("A");
    expect(p.pos).toEqual({ x: 5, y: 5 });
    expect(p.vel.x).toBeCloseTo(14, 5);
    expect(p.vel.y).toBeCloseTo(0, 5);
    expect(p.distRemaining).toBe(16);
  });
});

describe("advanceProjectile", () => {
  it("moves by vel*dt and spends range by the distance travelled", () => {
    const p = spawnArrow({
      ownerId: "A",
      pos: { x: 0, y: 0 },
      aim: 0,
      tick: 1,
      speed: 10,
      range: 16,
      damage: 1,
      knockback: 0.5,
    });
    const n = advanceProjectile(p, 0.5); // 10 m/s * 0.5 s = 5 m
    expect(n.pos.x).toBeCloseTo(5, 5);
    expect(n.distRemaining).toBeCloseTo(11, 5);
  });
});

describe("projectileTarget", () => {
  const arrow = spawnArrow({
    ownerId: "A",
    pos: { x: 2, y: 2 },
    aim: 0,
    tick: 1,
    speed: 14,
    range: 16,
    damage: 1,
    knockback: 0.5,
  });

  it("hits an alive, non-owner player whose body it overlaps", () => {
    const near = player("B", { x: 2 + FIGURE_RADIUS_M, y: 2 });
    expect(projectileTarget(arrow, [near])).toBe("B");
  });

  it("never hits its owner", () => {
    const owner = player("A", { x: 2, y: 2 });
    expect(projectileTarget(arrow, [owner])).toBeNull();
  });

  it("ignores dead players and anything out of range", () => {
    const dead = player("B", { x: 2, y: 2 }, "dead");
    const far = player("C", { x: 10, y: 10 });
    expect(projectileTarget(arrow, [dead, far])).toBeNull();
  });

  it("picks the nearest of several overlapping targets", () => {
    const b = player("B", { x: 2.6, y: 2 });
    const c = player("C", { x: 2.2, y: 2 });
    expect(projectileTarget(arrow, [b, c])).toBe("C");
  });

  it("hits generic Hittable targets, not just players (survival: arrows hit enemies)", () => {
    const enemy = { id: "e1-0", pos: { x: 2 + FIGURE_RADIUS_M, y: 2 }, status: "alive" as const };
    expect(projectileTarget(arrow, [enemy])).toBe("e1-0");
  });

  it("uses each target's own hitRadius so the overlap matches its sprite", () => {
    // A target 1.5 m ahead: a tiny-radius enemy is out of overlap; a large-radius one is caught.
    const tiny = { id: "t", pos: { x: 3.5, y: 2 }, status: "alive" as const, hitRadius: 0.1 };
    expect(projectileTarget(arrow, [tiny])).toBeNull();
    const huge = { id: "h", pos: { x: 3.5, y: 2 }, status: "alive" as const, hitRadius: 2.0 };
    expect(projectileTarget(arrow, [huge])).toBe("h");
  });
});

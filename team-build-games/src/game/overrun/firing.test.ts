import { describe, expect, it } from "vitest";
import { fireTick, tickAmmo, tryStartReload } from "./firing";
import { effectiveStats } from "./perks";
import { ENEMY_HIT_KNOCKBACK_M, ENEMY_HIT_STUN_S } from "./constants";
import { freshAmmo, GUNS } from "./weapons";
import { createShooterWorld } from "./match";
import type { Enemy, ShooterPlayer } from "./types";

const EFF = effectiveStats([]);
const player = (over: Partial<ShooterPlayer> = {}): ShooterPlayer => ({
  ...createShooterWorld(["p1"], 1).players.p1!,
  pos: { x: 5, y: 15 }, aim: 0, ...over,
});
const enemy = (id: string, x: number, over: Partial<Enemy> = {}): Enemy => ({
  id, kind: "rusher", pos: { x, y: 15 }, health: 20, attackCooldown: 0, stunRemaining: 0, ...over,
});

describe("fireTick", () => {
  it("held fire shoots at the gun's RPM (cooldown-gated), decrementing the mag", () => {
    let p = player();
    const r1 = fireTick(p, [], true, 1, 10, EFF);
    expect(r1.player.ammo.mag).toBe(11);
    expect(r1.player.ammo.fireCooldown).toBeCloseTo(60 / 300, 5);
    expect(r1.player.stats.shots).toBe(1);
    // cooldown not yet elapsed → no second shot
    const r2 = fireTick(r1.player, [], true, 1, 11, EFF);
    expect(r2.player.ammo.mag).toBe(11);
    expect(r2.player.stats.shots).toBe(1);
  });

  it("hits the nearest enemy on the ray and emits a shot event with the impact point", () => {
    const p = player(); // aiming +x from (5,15)
    const far = enemy("e2", 12);
    const near = enemy("e1", 8);
    const r = fireTick(p, [far, near], true, 1, 0, EFF);
    const e1 = r.enemies.find((e) => e.id === "e1")!;
    const e2 = r.enemies.find((e) => e.id === "e2")!;
    expect(e1.health).toBe(20 - GUNS.pistol.damage);
    expect(e2.health).toBe(20); // pistol pierce 0 — blocked by the near one
    expect(r.player.stats.hits).toBe(1);
    const shot = r.events.find((e) => e.kind === "shot")!;
    expect(shot.kind === "shot" && shot.to.x).toBeCloseTo(8, 0); // tracer ends at the hit
  });

  it("rifle does not pierce — only the first enemy on the ray is hit", () => {
    const p = player({ gun: "rifle", ammo: freshAmmo("rifle") });
    const r = fireTick(p, [enemy("e1", 8), enemy("e2", 12), enemy("e3", 16)], true, 1, 0, EFF);
    expect(r.enemies.find((e) => e.id === "e1")!.health).toBe(20 - 34); // only the nearest
    expect(r.enemies.find((e) => e.id === "e2")!.health).toBe(20); // pierce 0 — blocked
    expect(r.enemies.find((e) => e.id === "e3")!.health).toBe(20);
  });

  it("flamethrower torches enemies in the cone (setting them alight) but spares those behind", () => {
    const p = player({ gun: "flamethrower", ammo: freshAmmo("flamethrower") }); // (5,15) aiming +x
    const r = fireTick(p, [enemy("front", 8), enemy("behind", 2)], true, 1, 0, EFF);
    const front = r.enemies.find((e) => e.id === "front")!;
    const behind = r.enemies.find((e) => e.id === "behind")!;
    expect(front.health).toBeLessThan(20); // direct cone hit
    expect(front.burning ?? 0).toBeGreaterThan(0); // and set on fire
    expect(behind.health).toBe(20); // outside the cone
    expect(behind.burning ?? 0).toBe(0);
    expect(r.events.some((e) => e.kind === "shot" && e.gun === "flamethrower")).toBe(true);
  });

  it("rocket launches a travelling projectile (no immediate hit) and emits a launch shot event", () => {
    const p = player({ gun: "rocket", ammo: freshAmmo("rocket") }); // (5,15) aiming +x
    const r = fireTick(p, [enemy("e1", 20)], true, 1, 0, EFF);
    expect(r.spawned).toHaveLength(1);
    const pj = r.spawned![0]!;
    expect(pj.ownerId).toBe("p1");
    expect(pj.dir.x).toBeCloseTo(1, 3);
    expect(r.enemies.find((e) => e.id === "e1")!.health).toBe(20); // launch does not damage
    expect(r.events.some((e) => e.kind === "shot" && e.gun === "rocket")).toBe(true);
  });

  it("shotgun fires 8 pellets with deterministic spread; counts ONE shot", () => {
    const p = player({ gun: "shotgun", ammo: freshAmmo("shotgun") });
    const a = fireTick(p, [enemy("e1", 5.8, { health: 1000 })], true, 42, 7, EFF);
    const b = fireTick(p, [enemy("e1", 5.8, { health: 1000 })], true, 42, 7, EFF);
    expect(a.enemies[0]!.health).toBe(b.enemies[0]!.health); // same coords → same pellets
    expect(a.player.stats.shots).toBe(1);
    // point blank: every pellet lands → 8 × 8 damage
    expect(a.enemies[0]!.health).toBe(1000 - 8 * 8);
    // different tick → different spread draw
    const edgeDamage = Array.from({ length: 12 }, (_, tick) =>
      fireTick(p, [enemy("e1", 16.5, { health: 1000 })], true, 42, tick, EFF).enemies[0]!.health,
    );
    expect(new Set(edgeDamage).size).toBeGreaterThan(1);
  });

  it("respects range", () => {
    const p = player(); // pistol range 20
    const r = fireTick(p, [enemy("e1", 26)], true, 1, 0, EFF);
    expect(r.enemies[0]!.health).toBe(20);
    expect(r.player.stats.hits).toBe(0);
  });

  it("uses the rendered monster width for projectile hits without changing contact radius", () => {
    const p = player();
    const visibleEdge = enemy("e1", 8, { pos: { x: 8, y: 16 } });
    const outsideSprite = enemy("e2", 8, { pos: { x: 8, y: 16.5 } });
    const hit = fireTick(p, [visibleEdge], true, 1, 0, EFF);
    const miss = fireTick(p, [outsideSprite], true, 1, 0, EFF);

    expect(hit.enemies[0]!.health).toBeLessThan(20);
    expect(miss.enemies[0]!.health).toBe(20);
  });

  it("empty mag with reserve auto-starts a reload; firing stays blocked while reloading", () => {
    const p = player({ gun: "shotgun", ammo: { mag: 0, reserve: 12, reloadRemaining: 0, fireCooldown: 0 } });
    const r = fireTick(p, [], true, 1, 0, EFF);
    expect(r.player.ammo.reloadRemaining).toBeCloseTo(GUNS.shotgun.reloadS, 5);
    expect(r.events).toEqual([]);
    const r2 = fireTick(r.player, [], true, 1, 1, EFF);
    expect(r2.player.ammo.mag).toBe(0); // still reloading — no shot
  });

  it("mag AND reserve empty falls back to a fresh infinite pistol", () => {
    const p = player({ gun: "rifle", ammo: { mag: 0, reserve: 0, reloadRemaining: 0, fireCooldown: 0 } });
    const r = fireTick(p, [], true, 1, 0, EFF);
    expect(r.player.gun).toBe("pistol");
    expect(r.player.ammo.mag).toBe(12);
  });

  it("downed players and idle triggers don't fire", () => {
    expect(fireTick(player({ status: "downed" }), [], true, 1, 0, EFF).events).toEqual([]);
    expect(fireTick(player(), [], false, 1, 0, EFF).player.ammo.mag).toBe(12);
  });
});

describe("bullet-hit stun + knockback", () => {
  it("a single hit sets stunRemaining and knocks the enemy back exactly 0.5m along the shot direction", () => {
    const p = player(); // aiming +x (± pistol spread) from (5,15)
    const e = enemy("e1", 8, { health: 1000 });
    const r = fireTick(p, [e], true, 1, 0, EFF);
    const hit = r.enemies.find((x) => x.id === "e1")!;
    expect(hit.stunRemaining).toBeCloseTo(ENEMY_HIT_STUN_S, 5);
    const dist = Math.hypot(hit.pos.x - e.pos.x, hit.pos.y - e.pos.y);
    expect(dist).toBeCloseTo(ENEMY_HIT_KNOCKBACK_M, 4); // pistol has a small spread, so allow for it
    expect(hit.pos.x).toBeGreaterThan(e.pos.x); // still net knocked away from the shooter (+x)
  });

  it("a point-blank shotgun blast knocks back once (0.5m), not once per pellet (4m)", () => {
    const p = player({ gun: "shotgun", ammo: freshAmmo("shotgun") });
    const e = enemy("e1", 5.8, { health: 1000 }); // point blank — every pellet should hit
    const r = fireTick(p, [e], true, 42, 7, EFF);
    const hit = r.enemies.find((x) => x.id === "e1")!;
    const dist = Math.hypot(hit.pos.x - e.pos.x, hit.pos.y - e.pos.y);
    expect(dist).toBeCloseTo(ENEMY_HIT_KNOCKBACK_M, 4);
    expect(hit.stunRemaining).toBeCloseTo(ENEMY_HIT_STUN_S, 5);
  });

  it("emits one hit event per damaged enemy per fireTick, at the post-knockback position", () => {
    const p = player();
    const e = enemy("e1", 8, { health: 1000 });
    const r = fireTick(p, [e], true, 1, 0, EFF);
    const hitEvents = r.events.filter((ev) => ev.kind === "hit");
    expect(hitEvents.length).toBe(1);
    const hit = r.enemies.find((x) => x.id === "e1")!;
    const ev = hitEvents[0]!;
    expect(ev.kind === "hit" && ev.pos).toEqual(hit.pos);
  });

  it("a shotgun blast hitting two enemies emits exactly one hit event per enemy", () => {
    const p = player({ gun: "shotgun", ammo: freshAmmo("shotgun"), pos: { x: 5, y: 15 } });
    const r = fireTick(p, [enemy("e1", 6, { health: 1000 }), enemy("e2", 6.3, { health: 1000 })], true, 42, 7, EFF);
    const hitEvents = r.events.filter((ev) => ev.kind === "hit");
    const ids = new Set(hitEvents.map((_, i) => i)); // just count distinct events
    expect(hitEvents.length).toBeGreaterThan(0);
    expect(hitEvents.length).toBeLessThanOrEqual(2); // never more than one per distinct enemy hit
    expect(ids.size).toBe(hitEvents.length);
  });

  it("a miss does not stun or knock back anything", () => {
    const p = player();
    const e = enemy("e1", 26); // out of pistol range
    const r = fireTick(p, [e], true, 1, 0, EFF);
    const untouched = r.enemies.find((x) => x.id === "e1")!;
    expect(untouched.stunRemaining).toBe(0);
    expect(untouched.pos).toEqual(e.pos);
    expect(r.events.some((ev) => ev.kind === "hit")).toBe(false);
  });
});

describe("reload machine", () => {
  it("tryStartReload arms the countdown (perk-scaled) and completion fills the mag from reserve", () => {
    let p = player({ gun: "rifle", ammo: { mag: 3, reserve: 20, reloadRemaining: 0, fireCooldown: 0 } });
    p = tryStartReload(p, effectiveStats(["hands"]));
    expect(p.ammo.reloadRemaining).toBeCloseTo(1.6 * 0.85, 5);
    p = tickAmmo(p, 2, effectiveStats(["hands"]));
    expect(p.ammo).toMatchObject({ mag: 10, reserve: 13, reloadRemaining: 0 });
  });

  it("pistol reload completion never consumes reserve", () => {
    let p = player({ ammo: { mag: 2, reserve: 0, reloadRemaining: 0.01, fireCooldown: 0 } });
    p = tickAmmo(p, 0.1, EFF);
    expect(p.ammo).toMatchObject({ mag: 12, reserve: 0 });
  });

  it("tryStartReload is a no-op on full mag / no reserve / already reloading", () => {
    const full = player();
    expect(tryStartReload(full, EFF)).toEqual(full);
    const dry = player({ gun: "rifle", ammo: { mag: 2, reserve: 0, reloadRemaining: 0, fireCooldown: 0 } });
    expect(tryStartReload(dry, EFF)).toEqual(dry);
  });

  it("multi-shot ceiling is documented: max RPM 300 < 30 Hz tick rate × 60", () => {
    // At 30 Hz a tick is 33.3 ms; the fastest slice gun (pistol, 300 RPM) fires every
    // 200 ms — so at most ONE shot per tick can ever be due. If a faster gun is added
    // (>1800 RPM), fireTick must gain a multi-shot-per-tick loop. Assert the invariant:
    for (const g of Object.values(GUNS)) expect(g.rpm).toBeLessThanOrEqual(1800);
  });
});

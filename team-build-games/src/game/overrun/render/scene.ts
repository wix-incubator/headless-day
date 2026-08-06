/**
 * Overrun's fake-2.5D Phaser scene. The sim stays flat top-down in meters; we
 * foreshorten y by Y_SCALE and y-sort by world y for the 2.5D look. Wix-hosted
 * generated assets are loaded when configured; procedural textures remain as a
 * resilient fallback if the remote pack is unavailable.
 */

import Phaser from "phaser";
import {
  OVERRUN_FIELD_M, PLAYER_RADIUS_M, REVIVE_S,
  SPIT_HAZARD_TELEGRAPH_S, EXPLODER_FUSE_S, KRAKEN_STRIKE_TELEGRAPH_S,
} from "../constants";
import { ENEMIES, ENEMY_KINDS, krakenHp } from "../enemies";
import { GUNS, GUN_IDS } from "../weapons";
import { effectiveStats, xpToNext } from "../perks";
import { TOTAL_STAGES, stageForWave } from "../stages";
import type {
  EnemyKind, GunId, HazardKind, PickupKind, PlayerId, RawShooterInput, ShooterEvent, ShooterWorld, Vec2,
} from "../types";
import { screenDeltaToWorldAngle } from "./aim";
import { createShooterKeyboard, type ShooterKeyboardReader } from "./keyboard";
import type { OverrunConfig, OverrunHudState } from "./contract";

export type { OverrunConfig, OverrunDriver, OverrunEvent, OverrunHudState, OverrunMeta, TeammateHud } from "./contract";

// ---- 2.5D render constants (local — Overrun shares no constants with arena) --
const PX_PER_M = 28;
const MARGIN_X = 56;
const OFFSET_Y = 109;
const BOTTOM_PAD = 98;
const Y_SCALE = 0.62;
const FIELD_PX = OVERRUN_FIELD_M * PX_PER_M;
const PLAYER_R = PLAYER_RADIUS_M * PX_PER_M;

export const OVERRUN_WIDTH = MARGIN_X * 2 + FIELD_PX;
export const OVERRUN_HEIGHT = OFFSET_Y + FIELD_PX * Y_SCALE + BOTTOM_PAD;

const sx = (xm: number) => MARGIN_X + xm * PX_PER_M;
const sy = (ym: number) => OFFSET_Y + ym * PX_PER_M * Y_SCALE;

/** World aim angle → on-screen rotation on the foreshortened ground plane. */
const screenAngle = (aim: number) => Math.atan2(Math.sin(aim) * Y_SCALE, Math.cos(aim));

// ---- palette ------------------------------------------------------------------
const CAMO_BODY = 0x3f6212;
/** 8 distinct squad ring colors, indexed by colorIndex. */
const RING_COLORS = [0xf8fafc, 0xfbbf24, 0x38bdf8, 0xf472b6, 0xa3e635, 0xc084fc, 0xfb923c, 0x2dd4bf];
const GUN_TINT: Record<GunId, number> = { pistol: 0xd4d4d8, shotgun: 0xf59e0b, rifle: 0x38bdf8, autorifle: 0x22c55e, smg: 0xa78bfa, dmr: 0xf97316, flamethrower: 0xea580c, rocket: 0x4d7c0f };
const TRACER_COLOR: Record<GunId, number> = { pistol: 0xfef9c3, shotgun: 0xfbbf24, rifle: 0x7dd3fc, autorifle: 0x86efac, smg: 0xc4b5fd, dmr: 0xfdba74, flamethrower: 0xfb923c, rocket: 0xfca5a5 };

/** Procedural body/head colors per enemy kind (real art, when present, wins in preload). */
const ENEMY_VIS: Record<EnemyKind, { body: number; head: number }> = {
  rusher: { body: 0xef4444, head: 0xfca5a5 },
  tank: { body: 0x334155, head: 0x64748b },
  swarmling: { body: 0xf97316, head: 0xfed7aa },
  spitter: { body: 0x84cc16, head: 0xd9f99d },
  exploder: { body: 0xb91c1c, head: 0xfacc15 },
  hive: { body: 0x7e22ce, head: 0xd8b4fe },
  kraken: { body: 0x0e7490, head: 0x22d3ee },
};
/** Elite (frenzied/armored) tint — a gold sheen over the base sprite. */
const ELITE_TINT = 0xfde68a;

/** Hazard decal colors + the max telegraph (s) per kind, used to fill the warning ring as it counts down. */
const HAZARD_VIS: Record<HazardKind, { color: number; telegraph: number }> = {
  spit: { color: 0x84cc16, telegraph: SPIT_HAZARD_TELEGRAPH_S },
  blast: { color: 0xf97316, telegraph: EXPLODER_FUSE_S },
  strike: { color: 0xa855f7, telegraph: KRAKEN_STRIKE_TELEGRAPH_S },
};

const terrainTexture = (index: number) => `overrun-terrain-${index}`;
const campaignTerrainTexture = (index: number) => `overrun-campaign-terrain-${index}`;
const CAMPAIGN_TERRAIN_URLS = [
  "/assets/overrun/terrain/stage-1-parking-lot.webp",
  "/assets/overrun/terrain/stage-2-science-hall.webp",
  "/assets/overrun/terrain/stage-3-cargo-lift.webp",
  "/assets/overrun/terrain/stage-4-science-lab.webp",
  "/assets/overrun/terrain/stage-5-genetics-lab.webp",
  "/assets/overrun/terrain/stage-6-rooftop-helipad.webp",
] as const;
const playerTexture = (state: "idle" | "run-a" | "run-b" | "downed") => `overrun-player-${state}`;
const gunTexture = (gun: GunId) => `overrun-weapon-${gun}`;
const enemyTexture = (kind: EnemyKind, state: "alive" | "dead", variant: number) =>
  `overrun-enemy-${kind}-${state}-${variant}`;
const MEDKIT_TEXTURE = "overrun-medkit";
const ROCKET_TEXTURE = "overrun-rocket";

const GUN_VIEW: Record<GunId, { width: number; height: number; originX: number }> = {
  pistol: { width: 34, height: 17, originX: 0.25 },
  shotgun: { width: 58, height: 29, originX: 0.3 },
  rifle: { width: 64, height: 32, originX: 0.32 },
  autorifle: { width: 66, height: 30, originX: 0.33 },
  smg: { width: 44, height: 22, originX: 0.28 },
  dmr: { width: 72, height: 30, originX: 0.34 },
  flamethrower: { width: 56, height: 26, originX: 0.3 },
  rocket: { width: 70, height: 30, originX: 0.34 },
};

// Recoil kick (screen px) the weapon + hands snap back on each shot — small, but heftier per gun.
// The flamethrower streams continuously → no per-shot kick.
const GUN_RECOIL: Record<GunId, number> = { pistol: 3, rifle: 5, shotgun: 8, autorifle: 5, smg: 3, dmr: 9, flamethrower: 0, rocket: 12 };
/** Exponential recovery rate (1/s): kick decays to ~e⁻ᵏᵈᵗ each frame — snappy return to rest. */
const RECOIL_RECOVER = 18;
/** Fraction of the gun's kick the body/hands flinch back with it. */
const BODY_RECOIL = 0.2;

interface PlayerView {
  container: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Image;
  gun: Phaser.GameObjects.Image;
  /** White revive-progress ring shown while downed. */
  arc: Phaser.GameObjects.Graphics;
  /** Screen-space barrel tip, refreshed each frame — where tracers/flash emanate from. */
  muzzle: { x: number; y: number };
}

// Held-gun placement (screen px). The grip sits at hand height and leads slightly in the
// aim direction; the barrel length carries the muzzle out in front so shots leave the gun.
const HANDS_Y = -15;
const GUN_LEAD = 3;
/** Ticks per run-cycle half-step — higher = slower legs (30Hz sim). */
const RUN_FRAME_TICKS = 9;

interface EnemyView {
  image: Phaser.GameObjects.Image;
  kind: EnemyKind;
  phase: number;
}

interface PickupView {
  container: Phaser.GameObjects.Container;
  /** Random-ish phase so bobbing pickups don't move in lockstep. */
  phase: number;
}

export class OverrunScene extends Phaser.Scene {
  private cfg!: OverrunConfig;
  private keyboard!: ShooterKeyboardReader;
  private views: Record<PlayerId, PlayerView> = {};
  private enemyViews: Record<string, EnemyView> = {};
  private pickupViews: Record<string, PickupView> = {};
  private projectileViews: Record<string, Phaser.GameObjects.Image> = {};
  private terrain: Phaser.GameObjects.Image | null = null;
  private target: Phaser.GameObjects.Graphics | null = null;
  private terrainKey = "";
  private prev: ShooterWorld | null = null;
  private lastCountdown = 99;
  private lastProcessedTick = -1;
  private ended = false;
  /** Caps a shotgun blast's up-to-8 "hit" events to one enemyHit SFX per render frame. */
  private enemyHitEmittedThisFrame = false;
  /** Per-player weapon-recoil offset (px), spiked on each shot and decayed every frame. */
  private recoil: Record<PlayerId, number> = {};
  /** This frame's dt (s) — used to decay recoil frame-rate-independently. */
  private frameDt = 0;
  /** Ground-decal layer for hazards (spit pools, blast/strike telegraphs), redrawn each frame. */
  private hazardG: Phaser.GameObjects.Graphics | null = null;
  /** Boss HP bar (+ label), shown only while a Kraken is alive. */
  private bossBar: Phaser.GameObjects.Graphics | null = null;
  private bossText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("overrun");
  }

  preload(): void {
    this.cfg = this.registry.get("cfg") as OverrunConfig;
    if (CAMPAIGN_TERRAIN_URLS.length !== TOTAL_STAGES) {
      throw new Error(`Expected ${TOTAL_STAGES} Campaign terrains, received ${CAMPAIGN_TERRAIN_URLS.length}`);
    }
    CAMPAIGN_TERRAIN_URLS.forEach((url, index) => this.load.image(campaignTerrainTexture(index), url));
    const assets = this.cfg.assets;
    if (!assets) return;

    assets.terrain.forEach((entry, index) => this.load.image(terrainTexture(index), entry.url));
    this.load.image(playerTexture("idle"), assets.player.idle);
    this.load.image(playerTexture("run-a"), assets.player.run[0]);
    this.load.image(playerTexture("run-b"), assets.player.run[1]);
    this.load.image(playerTexture("downed"), assets.player.downed);
    for (const gun of ["pistol", "shotgun", "rifle"] as const) this.load.image(gunTexture(gun), assets.weapons[gun]);
    for (const kind of ["rusher", "tank"] as const) {
      for (const state of ["alive", "dead"] as const) {
        assets.enemies[kind]?.[state].forEach((url, variant) => this.load.image(enemyTexture(kind, state, variant), url));
      }
    }
  }

  create(): void {
    this.cfg = this.registry.get("cfg") as OverrunConfig;
    this.keyboard = createShooterKeyboard(this);
    this.makeTextures();
    this.drawField();
    this.hazardG = this.add.graphics().setDepth(-500); // ground decals: above terrain, below units
    this.bossBar = this.add.graphics().setDepth(20_000);
    this.bossText = this.add
      .text(0, 0, "⬣ KRAKEN", { fontFamily: "monospace", fontSize: "11px", color: "#f5d0fe", stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5, 0.5)
      .setDepth(20_001)
      .setResolution(2)
      .setVisible(false);
    this.makeTarget();
    this.game.canvas.style.cursor = "none";
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.frameDt = dt;
    const input = this.buildInput();
    const { world, countdown } = this.cfg.driver.frame(dt, input);

    this.renderTarget();
    this.fireCountdownSfx(countdown);
    this.renderTerrain(world);
    this.enemyHitEmittedThisFrame = false;
    this.detectReload(world);
    this.processEvents(world);
    this.renderHazards(world);
    this.renderPlayers(world);
    this.renderEnemies(world);
    this.renderProjectiles(world);
    this.renderPickups(world);
    this.renderBossBar(world);
    this.emitHud(world, countdown);

    if ((world.phase === "ended" || world.phase === "victory") && !this.ended) {
      this.ended = true;
      this.cfg.onEvent({ type: world.phase === "victory" ? "go" : "gameover" });
      this.cfg.onEnd(world);
    }
    this.prev = world;
  }

  // ---- input --------------------------------------------------------------------

  private buildInput(): RawShooterInput {
    const p = this.input.activePointer;
    const kbd = this.keyboard.read();
    const raw: RawShooterInput = { ...kbd, fire: p.isDown || kbd.fire };
    // Mouse aim: angle from the local player to the pointer (un-projecting the 2.5D y-squash).
    const me = this.prev?.players[this.cfg.driver.localId];
    if (me && me.status === "alive") {
      const dx = p.x - sx(me.pos.x);
      const dy = p.y - sy(me.pos.y);
      if (dx !== 0 || dy !== 0) raw.aim = screenDeltaToWorldAngle(dx, dy, Y_SCALE);
    }
    return raw;
  }

  // ---- events / SFX ---------------------------------------------------------------

  private makeTarget(): void {
    const g = this.add.graphics().setDepth(10_000);
    const drawTicks = () => {
      g.lineBetween(-16, 0, -8, 0);
      g.lineBetween(8, 0, 16, 0);
      g.lineBetween(0, -16, 0, -8);
      g.lineBetween(0, 8, 0, 16);
    };

    g.lineStyle(4, 0x020617, 0.8);
    drawTicks();
    g.strokeCircle(0, 0, 11);
    g.lineStyle(2, 0xf8fafc, 0.95);
    drawTicks();
    g.lineStyle(2, 0xfbbf24, 1);
    for (let quadrant = 0; quadrant < 4; quadrant += 1) {
      const start = quadrant * Math.PI / 2 + 0.14;
      g.beginPath();
      g.arc(0, 0, 11, start, start + Math.PI / 2 - 0.28);
      g.strokePath();
    }
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, 0, 2.2);
    this.target = g;
  }

  private renderTarget(): void {
    if (!this.target) return;
    const pointer = this.input.activePointer;
    this.target
      .setPosition(pointer.x, pointer.y)
      .setRotation(Math.sin(this.time.now * 0.0025) * 0.04)
      .setVisible(pointer.x >= 0 && pointer.x <= OVERRUN_WIDTH && pointer.y >= 0 && pointer.y <= OVERRUN_HEIGHT);
  }

  private fireCountdownSfx(countdown: number): void {
    if (countdown < this.lastCountdown && countdown >= 0 && this.lastCountdown <= 3) {
      this.cfg.onEvent(countdown > 0 ? { type: "tik", n: countdown } : { type: "go" });
    }
    this.lastCountdown = countdown;
  }

  /**
   * World events ride snapshots and linger for a few ticks (EVENT_TTL_TICKS), so the same
   * event is re-delivered across frames — only process ticks newer than the last one seen.
   */
  private processEvents(world: ShooterWorld): void {
    let maxTick = this.lastProcessedTick;
    for (const ev of world.events) {
      if (ev.tick <= this.lastProcessedTick) continue;
      if (ev.tick > maxTick) maxTick = ev.tick;
      this.handleEvent(ev, world);
    }
    this.lastProcessedTick = maxTick;
  }

  private handleEvent(ev: ShooterEvent, world: ShooterWorld): void {
    const localId = this.cfg.driver.localId;
    switch (ev.kind) {
      case "shot": {
        // Start the tracer at the firing player's on-screen barrel tip (2.5D: the world
        // `from` is a ground point, so it can't sit at the chest-height gun).
        const shooterId = this.nearestPlayerId(ev.from, world);
        const shooterView = shooterId ? this.views[shooterId] : undefined;
        const start = shooterView?.muzzle ?? { x: sx(ev.from.x), y: sy(ev.from.y) };
        if (ev.gun === "flamethrower") this.drawFlameCone(start, ev.to);
        else if (ev.gun === "rocket") this.drawMuzzleFlash(start); // the rocket itself is rendered in flight
        else this.drawTracer(start, ev.to, ev.gun);
        // Kick the shooter's weapon back (per-gun magnitude; a shotgun blast's 8 pellets don't stack).
        if (shooterId) this.recoil[shooterId] = Math.max(this.recoil[shooterId] ?? 0, GUN_RECOIL[ev.gun]);
        // SFX only for the local player's own shots (volume sanity in a full squad).
        if (shooterId === localId) this.cfg.onEvent({ type: "shot", gun: ev.gun });
        break;
      }
      case "kill":
        this.cfg.onEvent({ type: "kill" });
        break;
      case "pickup":
        this.cfg.onEvent({ type: "pickup", item: ev.item });
        break;
      case "levelup":
        this.cfg.onEvent({ type: "levelup" });
        break;
      case "downed":
        this.cfg.onEvent({ type: "downed", local: ev.playerId === localId });
        break;
      case "revived":
        this.cfg.onEvent({ type: "revived" });
        break;
      case "hit":
        // Up to 8 of these can land in a single tick (shotgun blast) — one SFX per frame.
        if (!this.enemyHitEmittedThisFrame) {
          this.enemyHitEmittedThisFrame = true;
          this.cfg.onEvent({ type: "enemyHit" });
        }
        break;
      case "playerHit":
        this.cfg.onEvent({ type: "playerHit", local: ev.playerId === localId });
        break;
      case "blast":
        this.drawExplosion(ev.pos, ev.radius);
        this.cfg.onEvent({ type: "enemyHit" }); // reuse the impact thump for the airburst
        break;
    }
  }

  /**
   * Render-side reload detection: no sim event exists for this — watch the LOCAL
   * player's ammo.reloadRemaining for a 0 → >0 transition (fires for both manual
   * R and auto-reload-on-empty-mag).
   */
  private detectReload(world: ShooterWorld): void {
    const prevR = this.prev?.players[this.cfg.driver.localId]?.ammo.reloadRemaining ?? 0;
    const local = world.players[this.cfg.driver.localId];
    const curR = local?.ammo.reloadRemaining ?? 0;
    if (local && prevR === 0 && curR > 0) this.cfg.onEvent({ type: "reload", gun: local.gun });
  }

  /** Shot events carry no playerId — attribute by whichever player is nearest the world origin. */
  private nearestPlayerId(from: Vec2, world: ShooterWorld): PlayerId | null {
    let bestId: PlayerId | null = null;
    let bestD = Infinity;
    for (const p of Object.values(world.players)) {
      const d = Math.hypot(p.pos.x - from.x, p.pos.y - from.y);
      if (d < bestD) {
        bestD = d;
        bestId = p.id;
      }
    }
    return bestId;
  }

  /** One-frame tracer: a fading line from the (screen-space) muzzle to the world impact + a flash dot. */
  private drawTracer(fromScreen: { x: number; y: number }, to: Vec2, gun: GunId): void {
    const g = this.add.graphics().setDepth(to.y + 0.01);
    g.setAlpha(0.7);
    g.lineStyle(gun === "rifle" ? 2 : 1.5, TRACER_COLOR[gun], 1);
    g.beginPath();
    g.moveTo(fromScreen.x, fromScreen.y);
    g.lineTo(sx(to.x), sy(to.y));
    g.strokePath();
    g.fillStyle(0xfff7ed, 1);
    g.fillCircle(fromScreen.x, fromScreen.y, 3);
    this.tweens.add({ targets: g, alpha: 0, duration: 80, onComplete: () => g.destroy() });
  }

  /** One-frame flame cone: layered translucent triangles from the muzzle, fanning to the range end. */
  private drawFlameCone(fromScreen: { x: number; y: number }, to: Vec2): void {
    const tx = sx(to.x);
    const ty = sy(to.y);
    const dx = tx - fromScreen.x;
    const dy = ty - fromScreen.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len; // unit perpendicular to the stream
    const py = dx / len;
    const halfW = len * 0.5; // ≈ tan(30°) spread at the far end
    const g = this.add.graphics().setDepth(to.y + 0.02);
    const layers: { color: number; w: number; a: number }[] = [
      { color: 0xdc2626, w: halfW, a: 0.26 },
      { color: 0xf97316, w: halfW * 0.68, a: 0.34 },
      { color: 0xfde047, w: halfW * 0.36, a: 0.42 },
    ];
    for (const l of layers) {
      g.fillStyle(l.color, l.a);
      g.beginPath();
      g.moveTo(fromScreen.x, fromScreen.y);
      g.lineTo(tx + px * l.w, ty + py * l.w);
      g.lineTo(tx - px * l.w, ty - py * l.w);
      g.closePath();
      g.fillPath();
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 95, onComplete: () => g.destroy() });
  }

  /** Brief bright puff at the muzzle (rocket launch — the rocket body is rendered in flight). */
  private drawMuzzleFlash(at: { x: number; y: number }): void {
    const g = this.add.graphics().setDepth(20_000);
    g.fillStyle(0xfff1c2, 0.9);
    g.fillCircle(at.x, at.y, 6);
    g.fillStyle(0xf59e0b, 0.5);
    g.fillCircle(at.x, at.y, 10);
    this.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() });
  }

  /** Expanding airburst ring + flash at a world point (rocket explosion), foreshortened to the ground. */
  private drawExplosion(pos: Vec2, radius: number): void {
    const rx = radius * PX_PER_M;
    const ry = rx * Y_SCALE;
    // Draw centered at local (0,0) and position the object, so setScale grows from the blast center.
    const g = this.add.graphics().setDepth(pos.y + 0.05).setPosition(sx(pos.x), sy(pos.y));
    g.fillStyle(0xfff1c2, 0.85);
    g.fillEllipse(0, 0, rx * 0.9, ry * 0.9);
    g.lineStyle(3, 0xf97316, 0.9);
    g.strokeEllipse(0, 0, rx * 2, ry * 2);
    g.setScale(0.4);
    // Grow from the center and fade — a quick concussive pop.
    this.tweens.add({ targets: g, scaleX: 1, scaleY: 1, alpha: 0, duration: 260, ease: "Cubic.Out", onComplete: () => g.destroy() });
  }

  // ---- rendering ------------------------------------------------------------------

  private renderTerrain(world: ShooterWorld): void {
    if (!this.terrain) return;
    const key = world.mode === "campaign"
      ? campaignTerrainTexture(stageForWave(world.wave).stage - 1)
      : terrainTexture(Math.abs(world.seed) % Math.max(1, this.cfg.assets?.terrain.length ?? 5));
    if (key === this.terrainKey) return;
    this.terrainKey = key;
    this.terrain.setTexture(key);
  }

  private renderPlayers(world: ShooterWorld): void {
    for (const p of Object.values(world.players)) {
      const v = this.views[p.id] ?? (this.views[p.id] = this.makePlayerView(p.id));

      if (p.status === "dead") {
        v.container.setVisible(false);
        continue;
      }
      v.container.setVisible(true);
      v.container.setPosition(sx(p.pos.x), sy(p.pos.y));
      v.container.setDepth(p.pos.y);
      const previous = this.prev?.players[p.id];
      const moving = !!previous && Math.hypot(previous.pos.x - p.pos.x, previous.pos.y - p.pos.y) > 0.003;
      const runFrame = (Math.floor(world.tick / RUN_FRAME_TICKS) + this.cfg.driver.getMeta(p.id).colorIndex) % 2;
      v.body.setTexture(
        p.status === "downed"
          ? playerTexture("downed")
          : moving
            ? playerTexture(runFrame === 0 ? "run-a" : "run-b")
            : playerTexture("idle"),
      );
      // Held gun: pivot at the hands, lead into the aim, flip upright when aiming left,
      // and stash the barrel tip so tracers start at the muzzle (not the torso).
      // Recoil pulls the gun (and, softly, the body) back along the aim on each shot.
      const gunView = GUN_VIEW[p.gun];
      const sa = screenAngle(p.aim);
      const kick = this.recoil[p.id] ?? 0;
      const lead = GUN_LEAD - kick;
      const reach = GUN_LEAD + gunView.width * (1 - gunView.originX) - kick;
      v.gun.setPosition(Math.cos(sa) * lead, HANDS_Y + Math.sin(sa) * lead);
      v.gun.setRotation(sa);
      v.gun.setFlipY(Math.cos(p.aim) < 0);
      v.gun.setTexture(gunTexture(p.gun));
      v.gun.setDisplaySize(gunView.width, gunView.height).setOrigin(gunView.originX, 0.5);
      v.muzzle = { x: sx(p.pos.x) + Math.cos(sa) * reach, y: sy(p.pos.y) + HANDS_Y + Math.sin(sa) * reach };

      const bodyKick = kick * BODY_RECOIL;
      const bodyX = -Math.cos(sa) * bodyKick;
      if (p.status === "downed") {
        v.body.setDisplaySize(58, 58).setPosition(0, 7);
        v.gun.setVisible(false);
        this.drawReviveArc(v.arc, p.reviveProgress / REVIVE_S);
      } else {
        v.body.setDisplaySize(60, 68).setPosition(bodyX, 8 - Math.sin(sa) * bodyKick);
        v.gun.setVisible(true);
        v.arc.clear();
      }

      // Decay the kick toward rest (frame-rate independent); drop tiny residue to 0.
      if (kick > 0) {
        const next = kick * Math.exp(-RECOIL_RECOVER * this.frameDt);
        this.recoil[p.id] = next < 0.1 ? 0 : next;
      }
    }
  }

  private drawReviveArc(g: Phaser.GameObjects.Graphics, fraction: number): void {
    const f = Math.max(0, Math.min(1, fraction));
    g.clear();
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.arc(0, 0, PLAYER_R + 5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    g.strokePath();
  }

  private renderEnemies(world: ShooterWorld): void {
    const live = new Set<string>();
    for (const e of world.enemies) {
      live.add(e.id);
      let view = this.enemyViews[e.id];
      if (!view) {
        const phase = hashText(e.id) % 3;
        const image = this.add.image(0, 0, enemyTexture(e.kind, "alive", phase)).setOrigin(0.5, 0.78);
        view = { image, kind: e.kind, phase };
        this.enemyViews[e.id] = view;
      }
      const cadence = e.kind === "rusher" ? 4 : 8;
      const frame = (view.phase + Math.floor(world.tick / cadence)) % 3;
      view.image.setTexture(enemyTexture(e.kind, "alive", frame));
      // Elites read a touch bigger than their kin.
      const visualWidth = ENEMIES[e.kind].hitRadius * PX_PER_M * 2 * (e.elite ? 1.15 : 1);
      view.image.setDisplaySize(visualWidth, e.kind === "rusher" ? visualWidth : visualWidth * (100 / 104));
      view.image.setPosition(sx(e.pos.x), sy(e.pos.y) + (e.kind === "rusher" ? 4 : 8));
      view.image.setDepth(e.pos.y);
      // On fire: flickering ember tint. Otherwise elites wear a gold sheen; normals are untinted.
      if ((e.burning ?? 0) > 0) view.image.setTint(world.tick % 6 < 3 ? 0xff7a1a : 0xffb020);
      else if (e.elite) view.image.setTint(ELITE_TINT);
      else view.image.clearTint();
    }
    for (const id of Object.keys(this.enemyViews)) {
      if (live.has(id)) continue;
      const view = this.enemyViews[id]!;
      delete this.enemyViews[id];
      const deadW = ENEMIES[view.kind].hitRadius * PX_PER_M * 2;
      view.image
        .setTexture(enemyTexture(view.kind, "dead", (view.phase + world.tick) % 3))
        .setOrigin(0.5)
        .clearTint()
        .setDisplaySize(deadW, deadW * 0.8);
      this.tweens.add({
        targets: view.image,
        alpha: 0,
        scale: 0.9,
        delay: 280,
        duration: 720,
        onComplete: () => view.image.destroy(),
      });
    }
  }

  private renderPickups(world: ShooterWorld): void {
    const live = new Set<string>();
    const t = this.time.now / 1000; // render-only wall clock: purely cosmetic bob
    for (const pk of world.pickups) {
      live.add(pk.id);
      const v = this.pickupViews[pk.id] ?? (this.pickupViews[pk.id] = this.makePickupView(pk.id, pk.kind));
      const bob = Math.sin(t * 3 + v.phase) * 2.5;
      v.container.setPosition(sx(pk.pos.x), sy(pk.pos.y) + bob);
      v.container.setDepth(pk.pos.y);
    }
    for (const id of Object.keys(this.pickupViews)) {
      if (!live.has(id)) {
        this.pickupViews[id]!.container.destroy();
        delete this.pickupViews[id];
      }
    }
  }

  /**
   * Ground-decal hazards, redrawn from scratch each frame (they're transient — no per-id view to keep).
   * Telegraphing hazards show a warning ring that FILLS as the fuse counts to 0; active spit pools show a
   * pulsing danger fill. Foreshortened to the 2.5D ground plane (y-squashed ellipses).
   */
  private renderHazards(world: ShooterWorld): void {
    const g = this.hazardG;
    if (!g) return;
    g.clear();
    for (const h of world.hazards ?? []) {
      const vis = HAZARD_VIS[h.kind];
      const cx = sx(h.pos.x);
      const cy = sy(h.pos.y);
      const w = h.radius * PX_PER_M * 2;
      const hgt = h.radius * PX_PER_M * 2 * Y_SCALE;
      if (h.telegraph > 0) {
        const frac = Math.max(0, Math.min(1, 1 - h.telegraph / vis.telegraph));
        g.fillStyle(vis.color, 0.12 + frac * 0.32);
        g.fillEllipse(cx, cy, w * (0.4 + 0.6 * frac), hgt * (0.4 + 0.6 * frac));
        g.lineStyle(2, vis.color, 0.9);
        g.strokeEllipse(cx, cy, w, hgt);
      } else {
        const pulse = 0.26 + 0.1 * Math.sin(this.time.now * 0.012);
        g.fillStyle(vis.color, pulse);
        g.fillEllipse(cx, cy, w, hgt);
        g.lineStyle(2, vis.color, 0.85);
        g.strokeEllipse(cx, cy, w, hgt);
      }
    }
  }

  /** Kraken boss HP bar across the top of the field — visible only while the boss lives. */
  private renderBossBar(world: ShooterWorld): void {
    const bar = this.bossBar;
    const txt = this.bossText;
    if (!bar || !txt) return;
    const boss = world.enemies.find((e) => e.kind === "kraken");
    if (!boss) {
      bar.clear();
      txt.setVisible(false);
      return;
    }
    const frac = Math.max(0, Math.min(1, boss.health / krakenHp(world.partySize)));
    const w = FIELD_PX * 0.6;
    const h = 14;
    const x = MARGIN_X + (FIELD_PX - w) / 2;
    const y = 18;
    bar.clear();
    bar.fillStyle(0x000000, 0.55);
    bar.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 4);
    bar.fillStyle(0x1f2937, 1);
    bar.fillRect(x, y, w, h);
    bar.fillStyle(0x9333ea, 1);
    bar.fillRect(x, y, w * frac, h);
    bar.lineStyle(2, 0xd8b4fe, 0.9);
    bar.strokeRect(x, y, w, h);
    txt.setPosition(MARGIN_X + FIELD_PX / 2, y + h / 2).setVisible(true);
  }

  private emitHud(world: ShooterWorld, countdown: number): void {
    const local = world.players[this.cfg.driver.localId];
    if (!local) return;
    const gunDef = GUNS[local.gun];
    const hud: OverrunHudState = {
      countdown,
      health: local.health,
      maxHealth: effectiveStats(local.perks).maxHealth,
      status: local.status,
      gun: local.gun,
      mag: local.ammo.mag,
      reserve: gunDef.reserveMax === null ? null : local.ammo.reserve,
      reloadFraction: Math.max(0, Math.min(1, local.ammo.reloadRemaining / gunDef.reloadS)),
      wave: world.wave,
      mode: world.mode,
      stage: stageForWave(world.wave).stage,
      stagesTotal: TOTAL_STAGES,
      intermission: world.intermission,
      stageIntroRemaining: world.stageIntroRemaining ?? 0,
      score: world.score,
      xp: local.xp,
      xpNext: xpToNext(local.level),
      level: local.level,
      offer: local.offers[0] ?? null,
      offersQueued: local.offers.length,
      kills: local.stats.kills,
      teammates: Object.values(world.players)
        .filter((p) => p.id !== local.id)
        .map((p) => {
          const meta = this.cfg.driver.getMeta(p.id);
          return { id: p.id, name: meta.name, colorIndex: meta.colorIndex, status: p.status, health: p.health };
        }),
    };
    this.cfg.onHud(hud);
  }

  // ---- setup ------------------------------------------------------------------------

  private makePlayerView(id: PlayerId): PlayerView {
    const meta = this.cfg.driver.getMeta(id);
    const shadow = this.add.ellipse(0, PLAYER_R * 0.55, PLAYER_R * 2.1, PLAYER_R * 0.8, 0x000000, 0.28);
    const ring = this.add.ellipse(0, PLAYER_R * 0.55, PLAYER_R * 2.2, PLAYER_R * 0.88).setStrokeStyle(2, RING_COLORS[meta.colorIndex % RING_COLORS.length]!, 0.95);
    const body = this.add.image(0, 8, playerTexture("idle")).setOrigin(0.5, 0.78).setDisplaySize(60, 68);
    const gun = this.add.image(0, -15, gunTexture("pistol")).setOrigin(GUN_VIEW.pistol.originX, 0.5).setDisplaySize(GUN_VIEW.pistol.width, GUN_VIEW.pistol.height);
    const arc = this.add.graphics();
    const children: Phaser.GameObjects.GameObject[] = [shadow, ring, body, gun, arc];
    if (id !== this.cfg.driver.localId) {
      const name = this.add
        .text(0, PLAYER_R + 6, meta.name, {
          fontFamily: "monospace",
          fontSize: "9px",
          color: "#e5e7eb",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setResolution(2);
      children.push(name);
    }
    const container = this.add.container(0, 0, children);
    return { container, ring, body, gun, arc, muzzle: { x: 0, y: 0 } };
  }

  private makePickupView(id: string, kind: PickupKind): PickupView {
    const glow = this.add.ellipse(0, 3, kind === "medkit" ? 24 : 40, kind === "medkit" ? 13 : 17, kind === "medkit" ? 0x22c55e : 0xf59e0b, 0.2);
    const img = this.add.image(0, 0, kind === "medkit" ? MEDKIT_TEXTURE : gunTexture(kind));
    if (kind === "medkit") img.setDisplaySize(18, 18);
    else img.setDisplaySize(kind === "shotgun" ? 38 : 42, kind === "shotgun" ? 19 : 21);
    const children: Phaser.GameObjects.GameObject[] = [glow, img];
    const container = this.add.container(0, 0, children);
    // Deterministic-enough phase from the id so bobs desync (render-only).
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return { container, phase: (h / 0xffff) * Math.PI * 2 };
  }

  // ---- procedural textures ------------------------------------------------------------

  private makeTextures(): void {
    for (let index = 0; index < 5; index += 1) this.makeFloorTexture(index);
    for (const state of ["idle", "run-a", "run-b", "downed"] as const) this.makeSoldierTexture(state);
    this.makeGunTextures();
    this.makeEnemyTextures();
    this.makePickupTextures();
  }

  private makeFloorTexture(index: number): void {
    const key = terrainTexture(index);
    if (this.textures.exists(key)) return;
    const w = FIELD_PX;
    const h = Math.ceil(FIELD_PX * Y_SCALE);
    const g = this.add.graphics();
    const fallbackColors = [0x181c16, 0x25261c, 0x30343b, 0x211b19, 0x252b30];
    g.fillStyle(fallbackColors[index]!, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0x2a3324, 0.5); // subtle camo-green grid
    const cell = PX_PER_M * 2;
    for (let x = 0; x <= w; x += cell) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += cell * Y_SCALE) g.lineBetween(0, y, w, y);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSoldierTexture(state: "idle" | "run-a" | "run-b" | "downed"): void {
    const key = playerTexture(state);
    if (this.textures.exists(key)) return;
    const r = PLAYER_R;
    const g = this.add.graphics();
    g.fillStyle(state === "downed" ? 0x64748b : CAMO_BODY, 1);
    if (state === "downed") g.fillEllipse(r, r + 4, r * 1.8, r * 1.2);
    else g.fillCircle(r, r, r - 2);
    g.fillStyle(0x365314, 1); // helmet shading
    g.fillCircle(r, r - r * 0.15, r * 0.45);
    g.generateTexture(key, Math.ceil(r * 2), Math.ceil(r * 2));
    g.destroy();
  }

  private makeGunTextures(): void {
    // Procedural fallback for every gun (real art, when present, is loaded in preload and wins).
    for (const gun of GUN_IDS) {
      const key = gunTexture(gun);
      if (this.textures.exists(key)) continue;
      const w = Math.max(12, Math.round(GUN_VIEW[gun].width * 0.42));
      const h = gun === "pistol" ? 5 : 6;
      const g = this.add.graphics();
      g.fillStyle(GUN_TINT[gun], 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  private makeEnemyTextures(): void {
    // Procedural fallback for EVERY roster kind (real art, when the pack ships it, wins in preload).
    for (const kind of ENEMY_KINDS) {
      const radius = ENEMIES[kind].radius * PX_PER_M;
      const vis = ENEMY_VIS[kind];
      const cx = radius;
      const cy = radius;
      for (const state of ["alive", "dead"] as const) {
        for (let variant = 0; variant < 3; variant += 1) {
          const key = enemyTexture(kind, state, variant);
          if (this.textures.exists(key)) continue;
          const g = this.add.graphics();
          if (state === "dead") {
            g.fillStyle(vis.body, 1);
            g.fillEllipse(cx, cy, radius * 1.9, radius * 1.1);
          } else {
            // Kraken: writhing tentacle nubs around the body (rotated per variant).
            if (kind === "kraken") {
              g.fillStyle(vis.body, 0.9);
              for (let i = 0; i < 8; i += 1) {
                const a = (i / 8) * Math.PI * 2 + variant * 0.25;
                g.fillCircle(cx + Math.cos(a) * radius * 0.75, cy + Math.sin(a) * radius * 0.75, radius * 0.22);
              }
            }
            g.fillStyle(vis.body, 1);
            g.fillCircle(cx, cy, radius - 2);
            // Head / warning highlight — jittered per variant so the frame cycle reads as motion.
            g.fillStyle(vis.head, 1);
            const headR = kind === "exploder" ? radius * (0.34 + variant * 0.07) : radius * 0.3;
            g.fillCircle(cx + (variant - 1) * radius * 0.08, cy - radius * 0.2, headR);
            // Hive: a cluster of pale spawn pods.
            if (kind === "hive") {
              g.fillStyle(0xfaf5ff, 0.9);
              for (let i = 0; i < 3; i += 1) g.fillCircle(cx + Math.cos(i * 2.1) * radius * 0.45, cy + Math.sin(i * 2.1) * radius * 0.45, radius * 0.12);
            }
          }
          const box = Math.ceil(radius * 2);
          g.generateTexture(key, box, box);
          g.destroy();
        }
      }
    }
  }

  private makePickupTextures(): void {
    if (this.textures.exists(MEDKIT_TEXTURE)) return;
    const s = 16;
    const mg = this.add.graphics();
    mg.fillStyle(0xf8fafc, 1); // medkit: white rounded square + red cross
    mg.fillRoundedRect(0, 0, s, s, 4);
    mg.fillStyle(0xdc2626, 1);
    mg.fillRect(s / 2 - 2, 3, 4, s - 6);
    mg.fillRect(3, s / 2 - 2, s - 6, 4);
    mg.generateTexture(MEDKIT_TEXTURE, s, s);
    mg.destroy();

    if (!this.textures.exists(ROCKET_TEXTURE)) {
      const rg = this.add.graphics(); // small rocket: dark body + orange flame tail, pointing +x
      rg.fillStyle(0xfb923c, 1);
      rg.fillTriangle(0, 3, 0, 11, -8, 7); // exhaust flame
      rg.fillStyle(0x3f3f46, 1);
      rg.fillRect(0, 3, 16, 8); // body
      rg.fillStyle(0xef4444, 1);
      rg.fillTriangle(16, 3, 16, 11, 22, 7); // nose cone
      rg.generateTexture(ROCKET_TEXTURE, 24, 14);
      rg.destroy();
    }
  }

  private renderProjectiles(world: ShooterWorld): void {
    const live = new Set<string>();
    for (const pj of world.projectiles ?? []) {
      live.add(pj.id);
      const img = this.projectileViews[pj.id] ?? (this.projectileViews[pj.id] = this.add.image(0, 0, ROCKET_TEXTURE).setOrigin(0.5).setDisplaySize(24, 14));
      img.setPosition(sx(pj.pos.x), sy(pj.pos.y));
      img.setRotation(screenAngle(Math.atan2(pj.dir.y, pj.dir.x)));
      img.setDepth(pj.pos.y + 0.03);
    }
    for (const id of Object.keys(this.projectileViews)) {
      if (live.has(id)) continue;
      this.projectileViews[id]!.destroy();
      delete this.projectileViews[id];
    }
  }

  private drawField(): void {
    const h = FIELD_PX * Y_SCALE;
    this.terrain = this.add
      .image(MARGIN_X + FIELD_PX / 2, OFFSET_Y + h / 2, campaignTerrainTexture(0))
      .setDisplaySize(FIELD_PX, h)
      .setDepth(-1001);
    this.add
      .rectangle(MARGIN_X + FIELD_PX / 2, OFFSET_Y + h / 2, FIELD_PX, h, 0x0f1714, 0.35)
      .setDepth(-1000.5);
    this.add
      .rectangle(MARGIN_X + FIELD_PX / 2, OFFSET_Y + h / 2, FIELD_PX, h)
      .setStrokeStyle(2, 0xb91c1c, 0.8) // red-alert perimeter
      .setDepth(-1000);
  }
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

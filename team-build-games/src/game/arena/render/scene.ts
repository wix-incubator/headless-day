import Phaser from "phaser";
import {
  ATTACK_TTL_S,
  BLOCK_TTL_S,
  BLOCK_WIDTH_MULT,
  FIELD_M,
  FIGURE_RADIUS_M,
  PX_PER_M,
} from "../../constants";
import { WEAPONS, WEAPON_INFO, WEAPON_LIST, type Weapon } from "../weapons";
import type { PlayerId, ProjectileKind, World } from "../types";
import { dashCooldownFraction } from "../dash";
import { attackCooldownFraction, blockCooldownFraction } from "../combat";
import { directionVector } from "../logic";
import { createKeyboard, type KeyboardReader } from "../input/keyboard";
import { screenDeltaToWorldAngle } from "../input/mouse";
import {
  BODY_ASSET,
  RIG_FIGHTER,
  SHAPE_RENDER_STYLE,
  SHAPES,
  isPremiumShape,
  type Shape,
} from "../cosmetic";
import type { ArenaEvent, HudState, MatchDriver } from "./contract";
import {
  deadEnemyFrame,
  ENEMY_ANIMATIONS,
  ENEMY_ATLAS_FRAME_SIZE,
  ENEMY_ATLAS_KINDS,
  ENEMY_DEATH_TOTAL_MS,
  livingEnemyFrame,
} from "./enemyAnimation";

export type { ArenaEvent, HudState, PlayerMeta, MatchDriver } from "./contract";

type RigPart = "body" | "weapon-arm" | "off-arm" | "left-leg" | "right-leg";

const rigTexture = (shape: Shape, part: RigPart) =>
  `fighter-rig-${shape}-${part}`;
const rigAsset = (shape: Shape, part: RigPart) =>
  part === "body" && isPremiumShape(shape)
    ? BODY_ASSET[shape]
    : `/assets/arena/warriors-rigged/${RIG_FIGHTER[shape]}/${part}.png`;
const weaponTexture = (weapon: Weapon) => `weapon-${weapon}`;
const TERRAIN_TEXTURE = "arena-terrain";
const ARROW_TEXTURE = "arrow";

// ---- 2.5D render constants (the sim stays flat top-down in meters) -----------
const DISPLAY_SCALE = 1.4;
const RENDER_PX_PER_M = PX_PER_M * DISPLAY_SCALE;
const MARGIN_X = 56 * DISPLAY_SCALE;
const OFFSET_Y = 109 * DISPLAY_SCALE;
const BOTTOM_PAD = 98 * DISPLAY_SCALE;
const Y_SCALE = 0.62;
const VIS_R = FIGURE_RADIUS_M * RENDER_PX_PER_M; // drawn body == physical body
const FIELD_PX = FIELD_M * RENDER_PX_PER_M;
const BODY_HEIGHT = VIS_R * 3.2;
const PREMIUM_BODY_HEIGHT = BODY_HEIGHT * 1.1;
const BODY_CORE_HEIGHT = BODY_HEIGHT * 0.66;
const BODY_CORE_Y = -BODY_HEIGHT * 0.18;
const HIP_Y = BODY_HEIGHT * 0.06;
const AVATAR_TEXTURE_SIZE = 128;

interface RigEndpoints {
  joint: { x: number; y: number };
  end: { x: number; y: number };
}

interface RigPose {
  weaponArm: RigEndpoints;
  offArm: RigEndpoints;
  leftLeg: RigEndpoints;
  rightLeg: RigEndpoints;
}

/** Normalized attachment points measured from the generated, tightly-cropped rig parts. */
const RIG_POSE: Record<Shape, RigPose> = {
  circle: {
    weaponArm: { joint: { x: 0.5, y: 0.04 }, end: { x: 0.52, y: 0.92 } },
    offArm: { joint: { x: 0.5, y: 0.04 }, end: { x: 0.48, y: 0.92 } },
    leftLeg: { joint: { x: 0.48, y: 0.03 }, end: { x: 0.56, y: 0.94 } },
    rightLeg: { joint: { x: 0.52, y: 0.03 }, end: { x: 0.44, y: 0.94 } },
  },
  square: {
    weaponArm: { joint: { x: 0.2, y: 0.08 }, end: { x: 0.82, y: 0.88 } },
    offArm: { joint: { x: 0.8, y: 0.05 }, end: { x: 0.18, y: 0.9 } },
    leftLeg: { joint: { x: 0.46, y: 0.03 }, end: { x: 0.58, y: 0.93 } },
    rightLeg: { joint: { x: 0.54, y: 0.03 }, end: { x: 0.42, y: 0.93 } },
  },
  triangle: {
    weaponArm: { joint: { x: 0.27, y: 0.05 }, end: { x: 0.76, y: 0.9 } },
    offArm: { joint: { x: 0.73, y: 0.05 }, end: { x: 0.22, y: 0.88 } },
    leftLeg: { joint: { x: 0.5, y: 0.03 }, end: { x: 0.54, y: 0.94 } },
    rightLeg: { joint: { x: 0.5, y: 0.03 }, end: { x: 0.46, y: 0.94 } },
  },
  diamond: {
    weaponArm: { joint: { x: 0.08, y: 0.4 }, end: { x: 0.92, y: 0.6 } },
    offArm: { joint: { x: 0.92, y: 0.25 }, end: { x: 0.08, y: 0.52 } },
    leftLeg: { joint: { x: 0.24, y: 0.05 }, end: { x: 0.64, y: 0.92 } },
    rightLeg: { joint: { x: 0.68, y: 0.05 }, end: { x: 0.36, y: 0.92 } },
  },
  "neon-ronin": {
    weaponArm: { joint: { x: 0.5, y: 0.04 }, end: { x: 0.52, y: 0.92 } },
    offArm: { joint: { x: 0.5, y: 0.04 }, end: { x: 0.48, y: 0.92 } },
    leftLeg: { joint: { x: 0.48, y: 0.03 }, end: { x: 0.56, y: 0.94 } },
    rightLeg: { joint: { x: 0.52, y: 0.03 }, end: { x: 0.44, y: 0.94 } },
  },
  "solar-warden": {
    weaponArm: { joint: { x: 0.2, y: 0.08 }, end: { x: 0.82, y: 0.88 } },
    offArm: { joint: { x: 0.8, y: 0.05 }, end: { x: 0.18, y: 0.9 } },
    leftLeg: { joint: { x: 0.46, y: 0.03 }, end: { x: 0.58, y: 0.93 } },
    rightLeg: { joint: { x: 0.54, y: 0.03 }, end: { x: 0.42, y: 0.93 } },
  },
};

const WEAPON_HEIGHT: Record<Weapon, number> = {
  sword: 15 * DISPLAY_SCALE,
  spear: 12 * DISPLAY_SCALE,
  knife: 9 * DISPLAY_SCALE,
  bow: 22 * DISPLAY_SCALE,
  katana: 14 * DISPLAY_SCALE,
  "solar-hammer": 30 * DISPLAY_SCALE,
};

/** Head placement in container pixels for each fighter illustration. */
const AVATAR_PLACEMENT: Record<Shape, { x: number; y: number; size: number }> =
  {
    circle: {
      x: 7 * DISPLAY_SCALE,
      y: -18 * DISPLAY_SCALE,
      size: 20 * DISPLAY_SCALE,
    },
    square: {
      x: 5 * DISPLAY_SCALE,
      y: -21 * DISPLAY_SCALE,
      size: 20 * DISPLAY_SCALE,
    },
    triangle: {
      x: 4 * DISPLAY_SCALE,
      y: -18 * DISPLAY_SCALE,
      size: 19 * DISPLAY_SCALE,
    },
    diamond: {
      x: -2 * DISPLAY_SCALE,
      y: -22 * DISPLAY_SCALE,
      size: 20 * DISPLAY_SCALE,
    },
    "neon-ronin": {
      x: 7 * DISPLAY_SCALE,
      y: -30 * DISPLAY_SCALE,
      size: 18 * DISPLAY_SCALE,
    },
    "solar-warden": {
      x: 5 * DISPLAY_SCALE,
      y: -29 * DISPLAY_SCALE,
      size: 18 * DISPLAY_SCALE,
    },
  };

export const ARENA_WIDTH = MARGIN_X * 2 + FIELD_PX;
export const ARENA_HEIGHT = OFFSET_Y + FIELD_PX * Y_SCALE + BOTTOM_PAD;

export interface ArenaConfig {
  driver: MatchDriver;
  onHud: (h: HudState) => void;
  onEvent: (e: ArenaEvent) => void;
  onEnd: (winnerId: PlayerId | null) => void;
}

interface PlayerView {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  leftLeg: Phaser.GameObjects.Image;
  rightLeg: Phaser.GameObjects.Image;
  shape: Shape;
  /** Weapon sprite (detailed per-weapon texture), drawn above the body so it's always visible. */
  sword: Phaser.GameObjects.Image;
  weaponArm: Phaser.GameObjects.Image;
  offArm: Phaser.GameObjects.Image;
  rigScale: number;
  /** Premium fighters use their authored full-body cutout instead of borrowed free rig pieces. */
  fullBody: boolean;
  pips: Phaser.GameObjects.Rectangle[];
  /** Signed-in member's circular photo, layered over the illustrated fighter's head. */
  avatar?: Phaser.GameObjects.Image;
  walkPhase: number;
  deadAnimated: boolean;
}

interface ProjectileView {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Ellipse;
  arrow: Phaser.GameObjects.Image;
  kind: ProjectileKind;
}

interface EnemyView {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  kind: keyof typeof ENEMY_ANIMATIONS;
  lastX: number;
  lastY: number;
  lastTick: number;
  moving: boolean;
  dyingSince: number | null;
  present: boolean;
}

const sx = (xm: number) => MARGIN_X + xm * RENDER_PX_PER_M;
const sy = (ym: number) => OFFSET_Y + ym * RENDER_PX_PER_M * Y_SCALE;

export class ArenaScene extends Phaser.Scene {
  private cfg!: ArenaConfig;
  private keyboard!: KeyboardReader;
  private views: Record<PlayerId, PlayerView> = {};
  private projViews: Record<string, ProjectileView> = {};
  private enemyViews: Record<string, EnemyView> = {};
  private prev: World | null = null;
  private lastCountdown = 99;
  private ended = false;

  constructor() {
    super("arena");
  }

  preload(): void {
    this.load.image(TERRAIN_TEXTURE, "/assets/arena/terrain.png");
    this.load.image(ARROW_TEXTURE, "/assets/arena/weapons/arrow.png");
    for (const shape of SHAPES) {
      for (const part of [
        "body",
        "weapon-arm",
        "off-arm",
        "left-leg",
        "right-leg",
      ] as RigPart[]) {
        this.load.image(rigTexture(shape, part), rigAsset(shape, part));
      }
    }
    for (const weapon of WEAPON_LIST) {
      this.load.image(weaponTexture(weapon), WEAPON_INFO[weapon].asset);
    }
    for (const kind of ENEMY_ATLAS_KINDS) {
      const spec = ENEMY_ANIMATIONS[kind];
      this.load.spritesheet(spec.texture, spec.asset, {
        frameWidth: ENEMY_ATLAS_FRAME_SIZE,
        frameHeight: ENEMY_ATLAS_FRAME_SIZE,
      });
    }
  }

  create(): void {
    this.cfg = this.registry.get("cfg") as ArenaConfig;
    this.keyboard = createKeyboard(this);
    this.input.mouse?.disableContextMenu();
    this.drawField();
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const raw = this.keyboard.read();
    // Mouse aim: angle from the local player to the pointer (un-projecting the 2.5D y-squash).
    const me = this.prev?.players[this.cfg.driver.localId];
    if (me && me.status === "alive") {
      const p = this.input.activePointer;
      const dx = p.x - sx(me.pos.x);
      const dy = p.y - sy(me.pos.y);
      if (dx !== 0 || dy !== 0)
        raw.aim = screenDeltaToWorldAngle(dx, dy, Y_SCALE);
      raw.block ||= p.rightButtonDown();
    }
    const { world, countdown } = this.cfg.driver.frame(dt, raw);

    this.fireCountdownSfx(countdown);
    this.diffEvents(this.prev, world);
    this.render(world, dt);
    this.emitHud(world, countdown);

    if (world.phase === "ended" && !this.ended) {
      this.ended = true;
      this.cfg.onEnd(world.winnerId);
    }
    this.prev = world;
  }

  // ---- events / SFX (derived from world diffs) --------------------------------

  private fireCountdownSfx(countdown: number): void {
    if (
      countdown < this.lastCountdown &&
      countdown >= 0 &&
      this.lastCountdown <= 3
    ) {
      this.cfg.onEvent(
        countdown > 0 ? { type: "tik", n: countdown } : { type: "go" },
      );
    }
    this.lastCountdown = countdown;
  }

  private diffEvents(prev: World | null, world: World): void {
    if (!prev) return;
    const localId = this.cfg.driver.localId;
    for (const p of Object.values(world.players)) {
      const before = prev.players[p.id];
      if (!before) continue;
      const isLocal = p.id === localId;
      if (isLocal && !before.dash.dashing && p.dash.dashing)
        this.cfg.onEvent({ type: "dash" });
      if (
        isLocal &&
        p.attackCooldownRemaining > before.attackCooldownRemaining
      ) {
        this.cfg.onEvent(
          WEAPONS[p.weapon].ranged ? { type: "shoot" } : { type: "attack" },
        );
      }
      if (p.blockImpactSeq > before.blockImpactSeq)
        this.cfg.onEvent({ type: "block" });
      if (p.health < before.health)
        this.cfg.onEvent({ type: "hit", local: isLocal });
      if (before.status === "alive" && p.status === "dead") {
        this.cfg.onEvent({ type: "death", local: isLocal });
      }
    }
  }

  // ---- rendering --------------------------------------------------------------

  private render(world: World, dt: number): void {
    for (const p of Object.values(world.players)) {
      const v = this.views[p.id] ?? (this.views[p.id] = this.makeView(p.id));

      if (p.status === "dead") {
        if (!v.deadAnimated) {
          v.deadAnimated = true;
          this.playDeath(v);
        }
        continue;
      }

      v.container.setPosition(sx(p.pos.x), sy(p.pos.y));
      v.container.setDepth(p.pos.y);

      const fv = directionVector(p.facing);
      const facingSign = fv.x < 0 ? -1 : 1;
      const before = this.prev?.players[p.id];
      const moving =
        !!before &&
        Math.hypot(p.pos.x - before.pos.x, p.pos.y - before.pos.y) > 0.001;
      if (moving) v.walkPhase += dt * (p.dash.dashing ? 17 : 10);
      const stride = moving ? Math.sin(v.walkPhase) : 0;
      const legSwing = stride * (p.dash.dashing ? 0.48 : 0.34);
      const bodyBob = moving
        ? -Math.abs(Math.cos(v.walkPhase)) * 1.8 * DISPLAY_SCALE
        : 0;
      const bodyTilt = moving ? stride * 0.025 * facingSign : 0;

      v.body.setFlipX(facingSign < 0);
      v.body.setPosition(
        0,
        (v.fullBody ? BODY_HEIGHT * 0.48 : BODY_CORE_Y) + bodyBob,
      );
      v.body.setRotation(bodyTilt);
      if (!v.fullBody) {
        this.poseRigLeg(
          v.leftLeg,
          RIG_POSE[v.shape].rightLeg,
          -5 * DISPLAY_SCALE,
          HIP_Y + bodyBob,
          Math.PI / 2 + legSwing,
          v.rigScale,
        );
        this.poseRigLeg(
          v.rightLeg,
          RIG_POSE[v.shape].leftLeg,
          5 * DISPLAY_SCALE,
          HIP_Y + bodyBob,
          Math.PI / 2 - legSwing,
          v.rigScale,
        );
      }
      v.shadow.setScale(moving ? 0.94 + Math.abs(stride) * 0.06 : 1, 1);
      if (v.avatar) {
        const placement = AVATAR_PLACEMENT[v.shape];
        v.avatar.setPosition(placement.x * facingSign, placement.y + bodyBob);
        v.avatar.setRotation(bodyTilt);
      }

      // Weapon visibility: bright + animated while striking, dimmed "ready" pose along the aim
      // when the cooldown is up, hidden while recharging (so readiness is readable at a glance).
      const stats = WEAPONS[p.weapon];
      const atk = p.attack;
      const block = p.block;
      const ready = p.attackCooldownRemaining <= 0;
      const shoulderOffset = Math.min(
        v.body.displayWidth * 0.28,
        13 * DISPLAY_SCALE,
      );
      const shoulderY = BODY_CORE_Y - 1 * DISPLAY_SCALE + bodyBob;
      const weaponShoulderX = shoulderOffset * facingSign;
      const offShoulderX = -shoulderOffset * facingSign;
      if (block) {
        // The weapon snaps across the fighter's front during the 0.2s interception window.
        // Its drawn thickness mirrors the simulation's 20% wider block coverage.
        const progress = Math.max(0, Math.min(1, 1 - block.ttl / BLOCK_TTL_S));
        const eased = 1 - (1 - progress) * (1 - progress);
        const poseAngle = block.aim + (eased * Math.PI) / 2;
        const visualReach = stats.ranged ? 1.8 : Math.max(1.2, stats.reach);
        const dx = Math.cos(poseAngle) * visualReach * RENDER_PX_PER_M;
        const dy =
          Math.sin(poseAngle) * visualReach * RENDER_PX_PER_M * Y_SCALE;
        const length = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / length;
        const uy = dy / length;
        const frontX = Math.cos(block.aim) * 0.55 * RENDER_PX_PER_M;
        const frontY = Math.sin(block.aim) * 0.55 * RENDER_PX_PER_M * Y_SCALE;
        const baseX = frontX - ux * length * 0.5;
        const baseY =
          frontY - uy * length * 0.5 - 2 * DISPLAY_SCALE + bodyBob * 0.65;

        v.sword
          .setVisible(true)
          .setAlpha(1)
          .setTexture(weaponTexture(p.weapon))
          .setPosition(baseX, baseY)
          .setRotation(Math.atan2(dy, dx))
          .setDisplaySize(length, WEAPON_HEIGHT[p.weapon] * BLOCK_WIDTH_MULT);
        this.poseRigArm(
          v.weaponArm,
          RIG_POSE[v.shape].weaponArm,
          weaponShoulderX,
          shoulderY,
          baseX + dx * 0.43,
          baseY + dy * 0.43,
        );
        this.poseRigArm(
          v.offArm,
          RIG_POSE[v.shape].offArm,
          offShoulderX,
          shoulderY + DISPLAY_SCALE,
          baseX + dx * 0.57,
          baseY + dy * 0.57,
        );
      } else if (!atk && !ready && !stats.special) {
        v.sword.setVisible(false);
        this.poseRigArm(
          v.weaponArm,
          RIG_POSE[v.shape].weaponArm,
          weaponShoulderX,
          shoulderY,
          10 * DISPLAY_SCALE * facingSign,
          bodyBob + 10 * DISPLAY_SCALE,
        );
        this.poseRigArm(
          v.offArm,
          RIG_POSE[v.shape].offArm,
          offShoulderX,
          shoulderY + DISPLAY_SCALE,
          -10 * DISPLAY_SCALE * facingSign,
          bodyBob + 12 * DISPLAY_SCALE,
        );
      } else {
        const aim = atk ? atk.aim : p.aim;
        const alpha = atk ? 1 : ready ? 0.5 : 0.22;
        // swing progress 0→1 over the swing's lifetime
        const progress = atk
          ? Math.max(0, Math.min(1, 1 - atk.ttl / ATTACK_TTL_S))
          : 0;
        v.sword.setVisible(true);
        v.sword.setAlpha(alpha);
        v.sword.setTexture(weaponTexture(p.weapon));
        const weaponBob = bodyBob * 0.65;
        let gripX = 0;
        let gripY = -2 * DISPLAY_SCALE + weaponBob;
        let offGripX = -10 * DISPLAY_SCALE * facingSign;
        let offGripY = bodyBob + 12 * DISPLAY_SCALE;
        if (stats.special?.kind === "solar-wave") {
          // The hammer lands head-first at attack start, then rebounds while the solar ring expands.
          const c = Math.cos(aim);
          const s = Math.sin(aim);
          const tipX = c * stats.reach * RENDER_PX_PER_M;
          const tipY = s * stats.reach * RENDER_PX_PER_M * Y_SCALE;
          const projectedLength = Math.max(1, Math.hypot(tipX, tipY));
          const ux = tipX / projectedLength;
          const uy = tipY / projectedLength;
          const rebound = atk ? (1 - progress) * 10 * DISPLAY_SCALE : 0;
          const gripFraction = 0.43;
          const armReach = BODY_CORE_HEIGHT * 0.48;
          gripX = weaponShoulderX + ux * armReach;
          gripY = shoulderY + uy * armReach + rebound;
          const baseX = gripX - ux * projectedLength * gripFraction;
          const baseY = gripY - uy * projectedLength * gripFraction;
          v.sword.setPosition(baseX, baseY);
          v.sword.setRotation(Math.atan2(tipY, tipX));
          v.sword.setDisplaySize(projectedLength, WEAPON_HEIGHT[p.weapon]);
          offGripX = baseX + ux * projectedLength * 0.56;
          offGripY = baseY + uy * projectedLength * 0.56;
        } else if (stats.ranged) {
          // Bow: the weapon hand owns the centre grip while the off hand pulls back near the face.
          const L = 1.8; // meters — damage is carried by the arrow, so this is purely visual
          const pull = atk ? Math.sin(progress * Math.PI) : 0;
          const tipX = Math.cos(aim) * L * RENDER_PX_PER_M;
          const tipY = Math.sin(aim) * L * RENDER_PX_PER_M * Y_SCALE;
          const projectedLength = Math.max(1, Math.hypot(tipX, tipY));
          const ux = tipX / projectedLength;
          const uy = tipY / projectedLength;
          const armReach = BODY_CORE_HEIGHT * 0.58;
          gripX = weaponShoulderX + ux * armReach;
          gripY = shoulderY + uy * armReach;
          const baseX = gripX - tipX * 0.5;
          const baseY = gripY - tipY * 0.5;
          v.sword.setPosition(baseX, baseY);
          v.sword.setRotation(Math.atan2(tipY, tipX));
          v.sword.setDisplaySize(
            projectedLength,
            WEAPON_HEIGHT[p.weapon] * (1 + pull * 0.12),
          );
          offGripX = -Math.cos(aim) * (6 + pull * 4) * DISPLAY_SCALE;
          offGripY =
            shoulderY -
            Math.sin(aim) * (6 + pull * 4) * DISPLAY_SCALE * Y_SCALE;
        } else if (stats.thrust) {
          // Spear held mid-shaft: at rest 40% of its length sits BEHIND the player; a strike
          // jabs it forward (out-and-back) so the tip reaches full reach at the peak.
          const jab = Math.sin(progress * Math.PI); // 0 → 1 → 0
          const shift = jab * 0.4 * stats.reach;
          const backM = -0.4 * stats.reach + shift; // tail (behind the player at rest)
          const frontM = 0.6 * stats.reach + shift; // tip
          const c = Math.cos(aim);
          const s = Math.sin(aim);
          const baseX = c * backM * RENDER_PX_PER_M;
          const baseY = s * backM * RENDER_PX_PER_M * Y_SCALE;
          const tipX = c * frontM * RENDER_PX_PER_M;
          const tipY = s * frontM * RENDER_PX_PER_M * Y_SCALE;
          v.sword.setPosition(baseX, baseY - 2 * DISPLAY_SCALE + weaponBob);
          v.sword.setRotation(Math.atan2(tipY - baseY, tipX - baseX));
          v.sword.setDisplaySize(
            Math.hypot(tipX - baseX, tipY - baseY),
            WEAPON_HEIGHT[p.weapon],
          );
          gripX = baseX + (tipX - baseX) * 0.42;
          gripY = baseY - 2 * DISPLAY_SCALE + weaponBob + (tipY - baseY) * 0.42;
          offGripX = baseX + (tipX - baseX) * 0.57;
          offGripY =
            baseY - 2 * DISPLAY_SCALE + weaponBob + (tipY - baseY) * 0.57;
        } else {
          // Sword/knife: sweep the cone from the player center (rest pose points along the aim).
          const half = stats.coneHalfAngle;
          const ang = atk ? aim - half + progress * 2 * half : aim;
          // Draw to the TRUE melee reach — the blade lands out to reach + a body radius, so extend
          // the sprite (and its swept arc) that far rather than the shorter nominal reach, which read
          // too small against the range it actually hits.
          const visualReachM = stats.reach + FIGURE_RADIUS_M;
          // Project onto the foreshortened ground plane (y * Y_SCALE) so on-screen reach matches.
          const tipX = Math.cos(ang) * visualReachM * RENDER_PX_PER_M;
          const tipY = Math.sin(ang) * visualReachM * RENDER_PX_PER_M * Y_SCALE;
          const projectedLength = Math.max(1, Math.hypot(tipX, tipY));
          const ux = tipX / projectedLength;
          const uy = tipY / projectedLength;
          const armReach =
            BODY_CORE_HEIGHT * (p.weapon === "knife" ? 0.34 : 0.46);
          const gripFraction = p.weapon === "knife" ? 0.22 : 0.14;
          const weaponCenterY = -2 * DISPLAY_SCALE + weaponBob;

          gripX = weaponShoulderX + ux * armReach;
          gripY = shoulderY + uy * armReach;
          const gripAlongAim = gripX * ux + (gripY - weaponCenterY) * uy;
          const fittedLength =
            (projectedLength - gripAlongAim) / (1 - gripFraction);
          const weaponLength = Math.max(projectedLength * 0.55, fittedLength);
          const baseX = gripX - ux * weaponLength * gripFraction;
          const baseY = gripY - uy * weaponLength * gripFraction;

          v.sword.setPosition(baseX, baseY);
          v.sword.setRotation(Math.atan2(tipY, tipX));
          v.sword.setDisplaySize(weaponLength, WEAPON_HEIGHT[p.weapon]);
        }
        this.poseRigArm(
          v.weaponArm,
          RIG_POSE[v.shape].weaponArm,
          weaponShoulderX,
          shoulderY,
          gripX,
          gripY,
        );
        this.poseRigArm(
          v.offArm,
          RIG_POSE[v.shape].offArm,
          offShoulderX,
          shoulderY + DISPLAY_SCALE,
          offGripX,
          offGripY,
        );
      }

      v.pips.forEach((pip, i) =>
        pip.setFillStyle(i < p.health ? 0xff5570 : 0x3a3a44),
      );
    }

    this.renderProjectiles(world);
    this.renderEnemies(world);
  }

  /** Pooled six-frame Survival enemies: walk/idle/attack on row one, local death playback on row two. */
  private renderEnemies(world: World): void {
    const enemies = world.enemies ?? [];
    const now = this.time.now;
    for (const view of Object.values(this.enemyViews)) view.present = false;

    for (const e of enemies) {
      let view = this.enemyViews[e.id];
      if (!view && e.status !== "alive") continue;
      if (!view) {
        const spec = ENEMY_ANIMATIONS[e.kind];
        const shadow = this.add.ellipse(
          0,
          0,
          spec.shadowWidthM * RENDER_PX_PER_M,
          spec.shadowHeightM * RENDER_PX_PER_M * Y_SCALE,
          0x000000,
          e.kind === "bat" ? 0.18 : 0.3,
        );
        const body = this.add
          .sprite(0, -spec.liftM * RENDER_PX_PER_M, spec.texture, 1)
          .setOrigin(0.5, spec.originY)
          .setDisplaySize(spec.displayM * RENDER_PX_PER_M, spec.displayM * RENDER_PX_PER_M);
        view = {
          container: this.add.container(0, 0, [shadow, body]),
          body,
          shadow,
          kind: e.kind,
          lastX: e.pos.x,
          lastY: e.pos.y,
          lastTick: world.tick,
          moving: false,
          dyingSince: null,
          present: true,
        };
        this.enemyViews[e.id] = view;
      }
      view.present = true;

      if (e.status === "dead") {
        view.dyingSince ??= now;
        continue;
      }

      if (view.lastTick !== world.tick) {
        view.moving = Math.hypot(e.pos.x - view.lastX, e.pos.y - view.lastY) > 0.002;
        view.lastX = e.pos.x;
        view.lastY = e.pos.y;
        view.lastTick = world.tick;
      }
      view.container.setPosition(sx(e.pos.x), sy(e.pos.y));
      view.container.setDepth(e.pos.y);
      view.body
        .setFrame(livingEnemyFrame(e.kind, view.moving, e.hitCooldownRemaining, now))
        .setFlipX(Math.cos(e.aim) < 0);
      const spec = ENEMY_ANIMATIONS[e.kind];
      const hover = e.kind === "bat" ? Math.sin(now / 115 + e.pos.x) * 0.08 * RENDER_PX_PER_M : 0;
      view.body.setY(-spec.liftM * RENDER_PX_PER_M + hover);
      view.shadow.setScale(e.kind === "bat" ? 0.9 + Math.sin(now / 115 + e.pos.x) * 0.06 : 1);
    }

    for (const id of Object.keys(this.enemyViews)) {
      const view = this.enemyViews[id]!;
      if (!view.present) view.dyingSince ??= now;
      if (view.dyingSince === null) continue;

      const elapsed = now - view.dyingSince;
      view.body.setFrame(deadEnemyFrame(elapsed));
      view.shadow.setAlpha(Math.max(0, 0.3 * (1 - elapsed / ENEMY_DEATH_TOTAL_MS)));
      view.container.setAlpha(Math.max(0, 1 - Math.max(0, elapsed - 430) / 220));
      if (elapsed >= ENEMY_DEATH_TOTAL_MS) {
        if (view.present) {
          view.container.setVisible(false);
          continue;
        }
        view.container.destroy(true);
        delete this.enemyViews[id];
      }
    }
  }

  /** Pooled arrow, crushing-disc, and expanding solar-ring views. */
  private renderProjectiles(world: World): void {
    const live = new Set<string>();
    for (const proj of world.projectiles) {
      const kind = proj.kind ?? "arrow";
      live.add(proj.id);
      let view = this.projViews[proj.id];
      if (!view) {
        const glow = this.add.ellipse(
          0,
          0,
          1.2 * RENDER_PX_PER_M,
          0.3 * RENDER_PX_PER_M,
          0xffd766,
          0.35,
        );
        const arrow = this.add
          .image(0, 0, ARROW_TEXTURE)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(1.15 * RENDER_PX_PER_M, 0.22 * RENDER_PX_PER_M)
          .setTint(0xfff0ad);
        view = {
          container: this.add.container(0, 0, [glow, arrow]),
          glow,
          arrow,
          kind,
        };
        this.projViews[proj.id] = view;
      }
      view.container.setPosition(sx(proj.pos.x), sy(proj.pos.y));
      view.container.setDepth(proj.pos.y + (kind === "solar-wave" ? -0.15 : 0.1));
      if (kind === "arrow") {
        view.container.setRotation(Math.atan2(proj.vel.y * Y_SCALE, proj.vel.x));
        view.arrow.setVisible(true);
        view.glow
          .setFillStyle(0xffd766, 0.35)
          .setStrokeStyle(0)
          .setDisplaySize(1.2 * RENDER_PX_PER_M, 0.3 * RENDER_PX_PER_M)
          .setAlpha(0.3 + Math.sin(world.tick * 0.7) * 0.08);
      } else if (kind === "crushing-wave") {
        const diameter = (proj.radius ?? 0.5) * 2 * RENDER_PX_PER_M;
        view.container.setRotation(
          Math.atan2(proj.vel.y * Y_SCALE, proj.vel.x) + Math.PI / 2,
        );
        view.arrow.setVisible(false);
        view.glow
          .setFillStyle(0x19dff5, 0.28)
          .setStrokeStyle(3 * DISPLAY_SCALE, 0xb9fbff, 0.95)
          .setDisplaySize(diameter, diameter * 0.28)
          .setAlpha(0.72 + Math.sin(world.tick * 0.9) * 0.12);
      } else {
        const diameter = Math.max(0.08, (proj.radius ?? 0) * 2) * RENDER_PX_PER_M;
        view.container.setRotation(0);
        view.arrow.setVisible(false);
        view.glow
          .setFillStyle(0xffb52e, 0)
          .setStrokeStyle(2.5 * DISPLAY_SCALE, 0xffffc2, 0.9)
          .setDisplaySize(diameter, diameter * Y_SCALE)
          .setAlpha(0.8);
      }
    }
    for (const id of Object.keys(this.projViews)) {
      if (!live.has(id)) {
        this.projViews[id]!.container.destroy(true);
        delete this.projViews[id];
      }
    }
  }

  /** Death juice: a quick recoil pop, then a spin-up while phasing out. */
  private playDeath(v: PlayerView): void {
    const startY = v.container.y;
    this.tweens.add({
      targets: v.container,
      y: startY - 18,
      scale: 1.15,
      duration: 130,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: v.container,
          y: startY - 60,
          angle: 180,
          alpha: 0,
          scale: 0.4,
          duration: 430,
          ease: "Cubic.easeIn",
          onComplete: () => v.container.setVisible(false),
        });
      },
    });
  }

  private emitHud(world: World, countdown: number): void {
    const local = world.players[this.cfg.driver.localId];
    this.cfg.onHud({
      countdown,
      health: local?.health ?? 0,
      dashFraction: local ? dashCooldownFraction(local.dash) : 1,
      attackFraction: local
        ? attackCooldownFraction(
            local.attackCooldownRemaining,
            WEAPONS[local.weapon].cooldown,
          )
        : 1,
      blockFraction: local
        ? blockCooldownFraction(local.blockCooldownRemaining)
        : 1,
      alive: local?.status === "alive",
    });
  }

  // ---- setup ------------------------------------------------------------------

  private poseRigLeg(
    leg: Phaser.GameObjects.Image,
    endpoints: RigEndpoints,
    hipX: number,
    hipY: number,
    targetAngle: number,
    scale: number,
  ): void {
    const sourceAngle = Math.atan2(
      (endpoints.end.y - endpoints.joint.y) * leg.height,
      (endpoints.end.x - endpoints.joint.x) * leg.width,
    );
    leg
      .setOrigin(endpoints.joint.x, endpoints.joint.y)
      .setPosition(hipX, hipY)
      .setScale(scale)
      .setRotation(targetAngle - sourceAngle);
  }

  private poseRigArm(
    arm: Phaser.GameObjects.Image,
    endpoints: RigEndpoints,
    shoulderX: number,
    shoulderY: number,
    handX: number,
    handY: number,
  ): void {
    const sourceDx = (endpoints.end.x - endpoints.joint.x) * arm.width;
    const sourceDy = (endpoints.end.y - endpoints.joint.y) * arm.height;
    const targetDx = handX - shoulderX;
    const targetDy = handY - shoulderY;
    const sourceLength = Math.max(1, Math.hypot(sourceDx, sourceDy));
    const targetLength = Math.max(1, Math.hypot(targetDx, targetDy));

    arm
      .setOrigin(endpoints.joint.x, endpoints.joint.y)
      .setPosition(shoulderX, shoulderY)
      .setScale(targetLength / sourceLength)
      .setRotation(
        Math.atan2(targetDy, targetDx) - Math.atan2(sourceDy, sourceDx),
      );
  }

  private makeView(id: PlayerId): PlayerView {
    const meta = this.cfg.driver.getMeta(id);
    const fullBody = isPremiumShape(meta.shape);
    const shadow = this.add.ellipse(
      0,
      BODY_HEIGHT * 0.48,
      VIS_R * 2.1,
      VIS_R * 0.8,
      0x000000,
      0.28,
    );
    const body = this.add.image(0, BODY_CORE_Y, rigTexture(meta.shape, "body"));
    const rigScale = fullBody
      ? PREMIUM_BODY_HEIGHT / body.height
      : BODY_CORE_HEIGHT / body.height;
    if (fullBody) {
      body
        .setOrigin(0.5, 1)
        .setPosition(0, BODY_HEIGHT * 0.48)
        .setScale(rigScale);
    } else {
      body.setScale(rigScale);
    }
    const leftLeg = this.add
      .image(0, 0, rigTexture(meta.shape, "right-leg"))
      .setScale(rigScale);
    const rightLeg = this.add
      .image(0, 0, rigTexture(meta.shape, "left-leg"))
      .setScale(rigScale);
    const weaponArm = this.add
      .image(0, 0, rigTexture(meta.shape, "weapon-arm"))
      .setScale(rigScale);
    const offArm = this.add
      .image(0, 0, rigTexture(meta.shape, "off-arm"))
      .setScale(rigScale);
    if (fullBody) {
      leftLeg.setVisible(false);
      rightLeg.setVisible(false);
      weaponArm.setVisible(false);
      offArm.setVisible(false);
    }
    const style = SHAPE_RENDER_STYLE[meta.shape];
    if (style.tint) {
      for (const part of [body, leftLeg, rightLeg, weaponArm, offArm]) {
        part.setTint(...style.tint);
      }
    }
    if (style.glow) {
      shadow.setFillStyle(style.glow, 0.22);
    }
    // Weapon: a detailed sprite whose handle pivots at the player center; stretched to reach and
    // rotated to the aim each frame. Its texture is set per-weapon in render().
    const sword = this.add
      .image(0, 0, weaponTexture("sword"))
      .setOrigin(0, 0.5)
      .setVisible(false);
    const name = this.add
      .text(0, -BODY_HEIGHT / 2 - 14 * DISPLAY_SCALE, meta.name, {
        fontFamily: "monospace",
        fontSize: `${9 * DISPLAY_SCALE}px`,
        color: "#f5f5f5",
        backgroundColor: "#111827",
        stroke: "#000000",
        strokeThickness: DISPLAY_SCALE,
        padding: { x: 4 * DISPLAY_SCALE, y: 2 * DISPLAY_SCALE },
      })
      .setOrigin(0.5, 1)
      .setResolution(2);
    const pips = [0, 1, 2].map((i) =>
      this.add
        .rectangle(
          (-8 + i * 8) * DISPLAY_SCALE,
          -BODY_HEIGHT / 2 - 5 * DISPLAY_SCALE,
          6 * DISPLAY_SCALE,
          4 * DISPLAY_SCALE,
          0xff5570,
        )
        .setOrigin(0.5),
    );
    // Limbs are independent sprites: legs sit behind the torso, while arms cover the weapon grip.
    const container = this.add.container(0, 0, [
      shadow,
      leftLeg,
      rightLeg,
      body,
      offArm,
      sword,
      weaponArm,
      name,
      ...pips,
    ]);
    const view: PlayerView = {
      container,
      body,
      shadow,
      leftLeg,
      rightLeg,
      shape: meta.shape,
      sword,
      weaponArm,
      offArm,
      rigScale,
      fullBody,
      pips,
      walkPhase: 0,
      deadAnimated: false,
    };
    if (meta.avatarUrl) this.loadAvatar(id, meta.avatarUrl, view);
    return view;
  }

  /**
   * Load a signed-in member's photo and layer it as a circular face over the fighter's head. Fully
   * best-effort: on load error OR a CORS-tainted source (the getImageData guard throws before we'd
   * ever hand a tainted canvas to WebGL), we simply keep the illustrated fighter. Never blocks render.
   */
  private loadAvatar(id: PlayerId, url: string, view: PlayerView): void {
    const srcKey = `avatar-src-${id}`;
    const cirKey = `avatar-cir-${id}`;
    const d = AVATAR_TEXTURE_SIZE;

    const apply = () => {
      try {
        if (!this.textures.exists(srcKey)) return;
        const src = this.textures
          .get(srcKey)
          .getSourceImage() as CanvasImageSource;
        const canvas = document.createElement("canvas");
        canvas.width = d;
        canvas.height = d;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.save();
        const inset = 5;
        ctx.beginPath();
        ctx.arc(d / 2, d / 2, d / 2 - inset, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(src, inset, inset, d - inset * 2, d - inset * 2);
        ctx.restore();
        ctx.strokeStyle = "#f5f5f5";
        ctx.lineWidth = inset * 2;
        ctx.beginPath();
        ctx.arc(d / 2, d / 2, d / 2 - inset, 0, Math.PI * 2);
        ctx.stroke();
        ctx.getImageData(0, 0, 1, 1); // taint guard: throws on a CORS-tainted source → keep the fighter
        if (this.textures.exists(cirKey)) this.textures.remove(cirKey);
        this.textures.addCanvas(cirKey, canvas);
        const placement = AVATAR_PLACEMENT[view.shape];
        const avatar = this.add
          .image(placement.x, placement.y, cirKey)
          .setDisplaySize(placement.size, placement.size);
        view.container.addAt(
          avatar,
          view.container.getIndex(view.weaponArm) + 1,
        );
        view.avatar = avatar;
      } catch {
        /* CORS-tainted or draw error → the illustrated fighter stays. */
      }
    };

    if (this.textures.exists(srcKey)) {
      apply();
      return;
    }
    this.load.crossOrigin = "anonymous"; // required so the CDN image yields a clean (untainted) canvas
    this.load.image({ key: srcKey, url });
    this.load.once(`filecomplete-image-${srcKey}`, apply);
    this.load.start();
  }

  private drawField(): void {
    const h = FIELD_PX * Y_SCALE;
    this.add
      .image(MARGIN_X + FIELD_PX / 2, OFFSET_Y + h / 2, TERRAIN_TEXTURE)
      .setDisplaySize(FIELD_PX, h)
      .setDepth(-1001);
    this.add
      .rectangle(MARGIN_X + FIELD_PX / 2, OFFSET_Y + h / 2, FIELD_PX, h)
      .setStrokeStyle(2, 0xd6b36a, 0.75)
      .setDepth(-1000);
  }
}

/**
 * Side-view squid renderer: ground (with the stage-2 hole), arched finish line,
 * and the octopus — legs tinted per controlling player, local leg highlighted.
 * Impure adapter: reads keyboard/pointer, drives the SquidDriver, redraws with
 * Graphics each frame. All world math is in meters; only this file knows pixels.
 */

import Phaser from "phaser";
import { SQUID_PALETTE } from "./palette";
import { COURSE_M, FINISH_X_M, HEAD_R_M, SQUID_PX_PER_M } from "../constants";
import { HEAD, TIP } from "../octopus";
import { stageById } from "../stage";
import { timeMsOf } from "../match";
import { legOf } from "../control";
import type { RawSquidInput, SquidWorld } from "../types";
import type { SquidConfig, SquidHudState } from "./contract";

const MARGIN_X = 100;
export const SQUID_W = MARGIN_X * 2 + COURSE_M * SQUID_PX_PER_M + 90; // room for the arch
export const SQUID_H = 440;
const GROUND_Y = 350;

const toX = (m: number): number => MARGIN_X + m * SQUID_PX_PER_M;
const toY = (m: number): number => GROUND_Y - m * SQUID_PX_PER_M;
const fromPx = (px: number, py: number): { x: number; y: number } => ({
  x: (px - MARGIN_X) / SQUID_PX_PER_M,
  y: (GROUND_Y - py) / SQUID_PX_PER_M,
});

const UNHELD = 0x64748b;
const colorOf = (i: number): number => SQUID_PALETTE[i % SQUID_PALETTE.length] ?? UNHELD;

export class SquidScene extends Phaser.Scene {
  private cfg!: SquidConfig;
  private g!: Phaser.GameObjects.Graphics;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    lift: Phaser.Input.Keyboard.Key;
    lift2: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    cycle: Phaser.Input.Keyboard.Key;
  };
  private pendingGrab: number | null = null;
  private lastCountdown = -1;
  private ended = false;
  private lastHud: SquidHudState | null = null;
  private lastWorld: SquidWorld | null = null;

  constructor() {
    super("squid");
  }

  create(): void {
    this.cfg = this.game.registry.get("cfg") as SquidConfig;
    this.g = this.add.graphics();
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      lift: kb.addKey(K.UP),
      lift2: kb.addKey(K.W),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      cycle: kb.addKey(K.SPACE),
    };
    // click near a leg's lower half to grab it
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const world = this.lastWorld;
      if (!world) return;
      const click = fromPx(p.x, p.y);
      let best: { leg: number; d: number } | null = null;
      world.legs.forEach((leg, i) => {
        for (const pi of leg.pts.slice(Math.floor(leg.pts.length / 2))) {
          const pt = world.points[pi]!.pos;
          const d = Math.hypot(pt.x - click.x, pt.y - click.y);
          if (d < 0.45 && (!best || d < best.d)) best = { leg: i, d };
        }
      });
      if (best) {
        // cast: TS loses narrowing on `let` vars reassigned inside a forEach closure
        this.pendingGrab = (best as { leg: number }).leg;
        this.cfg.onEvent({ type: "grab" });
      }
    });
  }

  private readInput(): RawSquidInput {
    return {
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
      lift: this.keys.lift.isDown || this.keys.lift2.isDown,
      cycle: this.keys.cycle.isDown,
      grabLeg: this.pendingGrab,
    };
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const input = this.readInput();
    const { world, countdown } = this.cfg.driver.frame(dt, input);
    this.lastWorld = world;
    this.pendingGrab = null; // grab is one-shot

    if (countdown !== this.lastCountdown) {
      if (countdown > 0) this.cfg.onEvent({ type: "tik", n: countdown });
      else if (this.lastCountdown > 0) this.cfg.onEvent({ type: "go" });
      this.lastCountdown = countdown;
    }
    if (world.result !== null && !this.ended) {
      this.ended = true;
      this.cfg.onEvent({ type: world.result === "finished" ? "finish" : "fall" });
      this.cfg.onEnd(world.result, timeMsOf(world));
    }

    const hud: SquidHudState = {
      countdown,
      timeMs: timeMsOf(world),
      myLeg: legOf(world.control, this.cfg.driver.localId),
      result: world.result,
    };
    const p = this.lastHud;
    if (!p || p.countdown !== hud.countdown || p.myLeg !== hud.myLeg || p.result !== hud.result || Math.abs(p.timeMs - hud.timeMs) >= 100) {
      this.lastHud = hud;
      this.cfg.onHud(hud);
    }

    this.draw(world);
  }

  private draw(world: SquidWorld): void {
    const g = this.g;
    g.clear();
    const stage = stageById(world.stage);

    // ground strips (leave the hole open) + hole shaft
    g.fillStyle(0x1e293b);
    const strips: [number, number][] = stage.hole
      ? [[-1, stage.hole.x], [stage.hole.x + stage.hole.width, COURSE_M + 2]]
      : [[-1, COURSE_M + 2]];
    for (const [x0, x1] of strips) g.fillRect(toX(x0), GROUND_Y, (x1 - x0) * SQUID_PX_PER_M, SQUID_H - GROUND_Y);
    if (stage.hole) {
      g.fillStyle(0x0b1220);
      g.fillRect(toX(stage.hole.x), GROUND_Y, stage.hole.width * SQUID_PX_PER_M, SQUID_H - GROUND_Y);
    }
    g.lineStyle(2, 0x334155).lineBetween(toX(-1), GROUND_Y, toX(COURSE_M + 2), GROUND_Y);

    // arched finish line
    const fx = toX(FINISH_X_M);
    g.lineStyle(6, 0xfbbf24);
    g.lineBetween(fx, GROUND_Y, fx, toY(1.6));
    g.lineBetween(fx + 46, GROUND_Y, fx + 46, toY(1.6));
    g.beginPath();
    g.arc(fx + 23, toY(1.6), 23, Math.PI, 0, false);
    g.strokePath();

    // legs: colored per controller; local player's leg gets a white glow underlay
    const myLeg = legOf(world.control, this.cfg.driver.localId);
    world.legs.forEach((leg, i) => {
      const holder = world.control[i];
      const color = holder ? colorOf(this.cfg.driver.getMeta(holder).colorIndex) : UNHELD;
      const chain = [world.points[HEAD]!, ...leg.pts.map((pi) => world.points[pi]!)];
      if (i === myLeg) {
        g.lineStyle(9, 0xffffff, 0.55);
        this.strokeChain(chain);
      }
      g.lineStyle(5, color, holder ? 1 : 0.7);
      this.strokeChain(chain);
      if (leg.planted) {
        const tip = world.points[leg.pts[TIP]!]!.pos;
        g.fillStyle(color, 1).fillCircle(toX(tip.x), toY(tip.y), 4);
      }
    });

    // head + eye
    const head = world.points[HEAD]!.pos;
    g.fillStyle(0x8b5cf6).fillCircle(toX(head.x), toY(head.y), HEAD_R_M * SQUID_PX_PER_M);
    g.fillStyle(0xffffff).fillCircle(toX(head.x) + 9, toY(head.y) - 5, 6);
    g.fillStyle(0x0f172a).fillCircle(toX(head.x) + 11, toY(head.y) - 5, 3);
  }

  private strokeChain(chain: { pos: { x: number; y: number } }[]): void {
    this.g.beginPath();
    this.g.moveTo(toX(chain[0]!.pos.x), toY(chain[0]!.pos.y));
    for (const p of chain.slice(1)) this.g.lineTo(toX(p.pos.x), toY(p.pos.y));
    this.g.strokePath();
  }
}

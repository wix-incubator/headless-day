import { describe, expect, it } from "vitest";
import {
  deadEnemyFrame,
  ENEMY_ANIMATIONS,
  livingEnemyFrame,
} from "./enemyAnimation";

describe("Survival enemy animation registry", () => {
  it("maps every simulation kind to a six-frame atlas", () => {
    expect(Object.keys(ENEMY_ANIMATIONS).sort()).toEqual([
      "ant",
      "bat",
      "clawed",
      "crawler",
      "dino",
      "zombie",
    ]);
    expect(ENEMY_ANIMATIONS.crawler.texture).toBe(ENEMY_ANIMATIONS.ant.texture);
  });

  it("alternates locomotion frames and holds the neutral pose when stationary", () => {
    expect(livingEnemyFrame("ant", false, 0, 0)).toBe(1);
    expect(livingEnemyFrame("ant", true, 0, 0)).toBe(0);
    expect(livingEnemyFrame("ant", true, 0, 145)).toBe(1);
  });

  it("shows the attack pose as soon as a contact cooldown starts", () => {
    expect(livingEnemyFrame("zombie", true, 1, 0)).toBe(2);
    expect(livingEnemyFrame("zombie", true, 0.5, 0)).not.toBe(2);
  });

  it("plays all three death frames and holds the final pose", () => {
    expect(deadEnemyFrame(0)).toBe(3);
    expect(deadEnemyFrame(150)).toBe(4);
    expect(deadEnemyFrame(300)).toBe(5);
    expect(deadEnemyFrame(10_000)).toBe(5);
  });
});

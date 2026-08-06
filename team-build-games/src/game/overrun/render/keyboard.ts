/** Phaser keyboard → RawShooterInput (WASD/arrows move, Space fire, R reload, 1/2/3 perk picks). */

import Phaser from "phaser";
import type { RawShooterInput } from "../types";

export interface ShooterKeyboardReader {
  read(): Omit<RawShooterInput, "aim">;
}

export function createShooterKeyboard(scene: Phaser.Scene): ShooterKeyboardReader {
  const kb = scene.input.keyboard;
  if (!kb) {
    return { read: () => ({ up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false }) };
  }
  const cursors = kb.createCursorKeys();
  const K = Phaser.Input.Keyboard.KeyCodes;
  const w = kb.addKey(K.W), a = kb.addKey(K.A), s = kb.addKey(K.S), d = kb.addKey(K.D);
  const r = kb.addKey(K.R);
  const space = kb.addKey(K.SPACE);
  const one = kb.addKey(K.ONE), two = kb.addKey(K.TWO), three = kb.addKey(K.THREE);
  return {
    read: () => ({
      up: cursors.up.isDown || w.isDown,
      down: cursors.down.isDown || s.isDown,
      left: cursors.left.isDown || a.isDown,
      right: cursors.right.isDown || d.isDown,
      fire: space.isDown,
      reload: r.isDown,
      pick1: one.isDown,
      pick2: two.isDown,
      pick3: three.isDown,
    }),
  };
}

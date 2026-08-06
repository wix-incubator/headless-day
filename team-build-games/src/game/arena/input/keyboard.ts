/**
 * Phaser keyboard → RawInput adapter (WASD/arrows + Shift dash + Space attack + Ctrl block).
 * Thin engine-coupled layer; the pure intent derivation lives in ../intent.ts.
 */

import Phaser from "phaser";
import type { RawInput } from "../types";

export interface KeyboardReader {
  read(): RawInput;
}

export function createKeyboard(scene: Phaser.Scene): KeyboardReader {
  const kb = scene.input.keyboard;
  if (!kb) {
    return {
      read: () => ({
        up: false,
        down: false,
        left: false,
        right: false,
        dash: false,
        attack: false,
        block: false,
      }),
    };
  }
  const cursors = kb.createCursorKeys();
  const w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  const a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  const s = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  const d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  const ctrl = kb.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

  return {
    read: (): RawInput => ({
      up: cursors.up.isDown || w.isDown,
      down: cursors.down.isDown || s.isDown,
      left: cursors.left.isDown || a.isDown,
      right: cursors.right.isDown || d.isDown,
      dash: cursors.shift.isDown,
      attack: cursors.space.isDown,
      block: ctrl.isDown,
    }),
  };
}

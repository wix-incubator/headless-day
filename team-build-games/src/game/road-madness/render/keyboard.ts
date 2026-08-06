import Phaser from "phaser";
import type { RawDriveInput } from "../types";

export interface RoadKeyboardReader {
  read(): RawDriveInput;
}

const IDLE: RawDriveInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  handbrake: false,
  boost: false,
};

export function createRoadKeyboard(scene: Phaser.Scene): RoadKeyboardReader {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return { read: () => IDLE };
  const cursors = keyboard.createCursorKeys();
  const K = Phaser.Input.Keyboard.KeyCodes;
  const w = keyboard.addKey(K.W);
  const a = keyboard.addKey(K.A);
  const s = keyboard.addKey(K.S);
  const d = keyboard.addKey(K.D);
  const space = keyboard.addKey(K.SPACE);
  const shift = keyboard.addKey(K.SHIFT);
  keyboard.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE]);
  return {
    read: () => ({
      up: cursors.up.isDown || w.isDown,
      down: cursors.down.isDown || s.isDown,
      left: cursors.left.isDown || a.isDown,
      right: cursors.right.isDown || d.isDown,
      handbrake: space.isDown,
      boost: shift.isDown,
    }),
  };
}


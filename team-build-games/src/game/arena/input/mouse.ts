/**
 * Mouse → aim-angle helper. The pointer lives in screen space where the field's y axis is
 * foreshortened by `yScale` (the 2.5D look), so we un-project dy before taking the angle —
 * giving a world-space aim that the sim's cone (also world-space) matches exactly.
 * Pure + engine-free so it can be unit-tested; the Phaser scene supplies the deltas.
 */

/** World-space aim angle (radians) for a screen-space delta from the player to the pointer. */
export function screenDeltaToWorldAngle(dxScreen: number, dyScreen: number, yScale: number): number {
  return Math.atan2(dyScreen / yScale, dxScreen);
}

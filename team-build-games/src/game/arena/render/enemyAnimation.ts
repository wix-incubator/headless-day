import { ENEMY_STATS } from "../survival/enemy";
import type {
  SpawnableSurvivalEnemyKind,
  SurvivalEnemyKind,
} from "../survival/waves";

export const ENEMY_ATLAS_FRAME_SIZE = 256;
export const ENEMY_DEATH_FRAME_MS = 150;
export const ENEMY_DEATH_TOTAL_MS = 650;

export interface EnemyAnimationSpec {
  texture: string;
  asset: string;
  /** Square frame size in world metres; transparent padding preserves each creature's proportions. */
  displayM: number;
  originY: number;
  liftM: number;
  shadowWidthM: number;
  shadowHeightM: number;
}

const ant: EnemyAnimationSpec = {
  texture: "survival-enemy-ant",
  asset: "/assets/arena/enemies/atlases/ant.png",
  displayM: 2.1,
  originY: 0.88,
  liftM: 0.04,
  shadowWidthM: 1.35,
  shadowHeightM: 0.48,
};

export const ENEMY_ANIMATIONS: Record<SurvivalEnemyKind, EnemyAnimationSpec> = {
  crawler: ant,
  ant,
  zombie: {
    texture: "survival-enemy-zombie",
    asset: "/assets/arena/enemies/atlases/zombie.png",
    displayM: 2.55,
    originY: 0.94,
    liftM: 0,
    shadowWidthM: 1.1,
    shadowHeightM: 0.44,
  },
  bat: {
    texture: "survival-enemy-bat",
    asset: "/assets/arena/enemies/atlases/bat.png",
    displayM: 2.45,
    originY: 0.82,
    liftM: 0.55,
    shadowWidthM: 1.25,
    shadowHeightM: 0.42,
  },
  dino: {
    texture: "survival-enemy-dino",
    asset: "/assets/arena/enemies/atlases/dino.png",
    displayM: 3.05,
    originY: 0.9,
    liftM: 0.03,
    shadowWidthM: 1.9,
    shadowHeightM: 0.62,
  },
  clawed: {
    texture: "survival-enemy-clawed",
    asset: "/assets/arena/enemies/atlases/clawed.png",
    displayM: 2.85,
    originY: 0.94,
    liftM: 0,
    shadowWidthM: 1.55,
    shadowHeightM: 0.55,
  },
};

export const ENEMY_ATLAS_KINDS: readonly SpawnableSurvivalEnemyKind[] = [
  "ant",
  "zombie",
  "bat",
  "dino",
  "clawed",
];

/** Living atlas frames: walk A/B (0/1), then the contact attack (2). */
export function livingEnemyFrame(
  kind: SurvivalEnemyKind,
  moving: boolean,
  hitCooldownRemaining: number,
  nowMs: number,
): number {
  const attackWindow = Math.min(0.26, ENEMY_STATS[kind].hitCooldown * 0.42);
  if (hitCooldownRemaining > ENEMY_STATS[kind].hitCooldown - attackWindow) return 2;
  if (!moving) return 1;
  return Math.floor(nowMs / 145) % 2;
}

/** Dead atlas frames are the second row: impact, collapse, rest (3/4/5). */
export function deadEnemyFrame(elapsedMs: number): number {
  return 3 + Math.min(2, Math.floor(Math.max(0, elapsedMs) / ENEMY_DEATH_FRAME_MS));
}

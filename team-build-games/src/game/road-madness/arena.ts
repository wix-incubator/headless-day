/** Deterministic Last Madman arena features derived from the round number. */

import {
  SPEED_PAD_RADIUS_M,
  SPIKE_TOWER_RADIUS_M,
} from "./constants";
import type { Vec2 } from "./types";

export interface SpikeTower {
  id: string;
  pos: Vec2;
  radius: number;
}

export interface SpeedPad {
  id: string;
  pos: Vec2;
  radius: number;
}

export interface RoadArenaFeatures {
  towers: [SpikeTower, SpikeTower];
  speedPads: [SpeedPad, SpeedPad];
}

type Pair = readonly [Vec2, Vec2];

const ROUND_LAYOUTS: ReadonlyArray<{ towers: Pair; speedPads: Pair }> = [
  {
    towers: [{ x: 11, y: 8 }, { x: 19, y: 12 }],
    speedPads: [{ x: 15, y: 5.5 }, { x: 15, y: 14.5 }],
  },
  {
    towers: [{ x: 10, y: 12 }, { x: 20, y: 8 }],
    speedPads: [{ x: 7.5, y: 10 }, { x: 22.5, y: 10 }],
  },
  {
    towers: [{ x: 13, y: 6.5 }, { x: 17, y: 13.5 }],
    speedPads: [{ x: 8, y: 14 }, { x: 22, y: 6 }],
  },
  {
    towers: [{ x: 13, y: 13.5 }, { x: 17, y: 6.5 }],
    speedPads: [{ x: 8, y: 6 }, { x: 22, y: 14 }],
  },
];

export function arenaFeaturesForRound(roundNumber: number): RoadArenaFeatures {
  const index = Math.max(0, Math.floor(roundNumber) - 1) % ROUND_LAYOUTS.length;
  const layout = ROUND_LAYOUTS[index]!;
  return {
    towers: [
      { id: "tower-a", pos: { ...layout.towers[0] }, radius: SPIKE_TOWER_RADIUS_M },
      { id: "tower-b", pos: { ...layout.towers[1] }, radius: SPIKE_TOWER_RADIUS_M },
    ],
    speedPads: [
      { id: "speed-a", pos: { ...layout.speedPads[0] }, radius: SPEED_PAD_RADIUS_M },
      { id: "speed-b", pos: { ...layout.speedPads[1] }, radius: SPEED_PAD_RADIUS_M },
    ],
  };
}

export const arenaFeatureCooldownKey = (
  kind: "tower" | "pad",
  carId: string,
  featureId: string,
): string => JSON.stringify([kind, carId, featureId]);

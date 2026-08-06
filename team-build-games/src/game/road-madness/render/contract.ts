import type {
  CarStatus,
  PlayerId,
  RawDriveInput,
  RoadBestOf,
  RoadPhase,
  RoadRoundEndReason,
  RoadWorld,
  VehicleClass,
} from "../types";

export interface RoadPlayerMeta {
  name: string;
  colorIndex: number;
  vehicle: VehicleClass;
}

export interface RoadDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawDriveInput): { world: RoadWorld; countdown: number; roundBreak: number };
  getMeta(id: PlayerId): RoadPlayerMeta;
}

export interface RoadHudState {
  countdown: number;
  health: number;
  maxHealth: number;
  speed: number;
  status: CarStatus;
  alive: number;
  total: number;
  damageDealt: number;
  elapsed: number;
  matchElapsed: number;
  nitro: number;
  boosting: boolean;
  phase: RoadPhase;
  roundNumber: number;
  bestOf: RoadBestOf;
  roundWins: Record<PlayerId, number>;
  roundWinnerId: PlayerId | null;
  roundEndReason: RoadRoundEndReason | null;
  roundBreak: number;
  suddenDeath: boolean;
  damageMultiplier: number;
}

export type RoadRenderEvent =
  | { type: "impact"; local: boolean; damage: number }
  | { type: "wrecked"; local: boolean }
  | { type: "nitro"; local: boolean };

export interface RoadSceneConfig {
  driver: RoadDriver;
  onHud: (hud: RoadHudState) => void;
  onEvent: (event: RoadRenderEvent) => void;
  onEnd: (world: RoadWorld) => void;
}

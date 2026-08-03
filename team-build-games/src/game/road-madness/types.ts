/**
 * Engine-free domain types for Road Madness. The canonical world uses meters,
 * +x right and +y down. Phaser, the DOM and network code depend on these types;
 * this module never depends on them.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type PlayerId = string;
export type RoadMode = "race" | "last-madman" | "carnage" | "bomb-tag";
export type VehicleClass = "sport" | "derby" | "monster" | "street";
export type CarStatus = "alive" | "wrecked" | "removed";
export type RoadPhase = "playing" | "round-ended" | "ended";
export type Bumper = "front" | "rear" | "side";
export type RoadBestOf = 1 | 3 | 5;
export type BotDifficulty = "rookie" | "mad" | "maniac";
export type RoadRoundEndReason = "last-alive" | "timeout" | "draw";

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Normalized client input. This is the only gameplay state a peer may submit. */
export interface DriveIntent {
  /** -1 full brake/reverse, +1 full forward throttle. */
  throttle: number;
  /** -1 left, +1 right. */
  steer: number;
  handbrake: boolean;
  boost: boolean;
}

/** Held keyboard state read by the Phaser adapter. */
export interface RawDriveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  boost: boolean;
}

export interface CarState {
  id: PlayerId;
  vehicle: VehicleClass;
  pos: Vec2;
  vel: Vec2;
  /** World-space forward angle, in radians. */
  heading: number;
  health: number;
  maxHealth: number;
  status: CarStatus;
  isBot: boolean;
  colorIndex: number;
  /** Damage dealt during the current round, used by the timeout tie-break. */
  roundDamageDealt: number;
  /** Damage dealt across the whole best-of match. */
  damageDealt: number;
  /** Rechargeable normalized nitro reserve, from empty (0) to full (1). */
  nitro: number;
  /** Canonical boost state for presentation and later network snapshots. */
  boosting: boolean;
  /** Tick at which health reached zero; null until the car is wrecked. */
  wreckedAtTick: number | null;
}

export interface RoadRules {
  /** Host-owned rule. Some future modes can normalize speed by disabling nitro. */
  nitroEnabled: boolean;
  bestOf: RoadBestOf;
  botDifficulty: BotDifficulty;
}

export type RoadEvent =
  | {
      tick: number;
      kind: "impact";
      sourceId: PlayerId;
      targetId: PlayerId;
      point: Vec2;
      damage: number;
      bumper: Exclude<Bumper, "side">;
    }
  | { tick: number; kind: "wrecked"; carId: PlayerId; byId: PlayerId | null; point: Vec2 }
  | { tick: number; kind: "nitro"; carId: PlayerId; point: Vec2 }
  | { tick: number; kind: "speed-pad"; carId: PlayerId; padId: string; point: Vec2 }
  | {
      tick: number;
      kind: "tower-hit";
      carId: PlayerId;
      towerId: string;
      point: Vec2;
      damage: number;
    };

export interface RoadWorld {
  tick: number;
  mode: RoadMode;
  phase: RoadPhase;
  /** Current-round elapsed time; reset when the next round is staged. */
  elapsed: number;
  matchElapsed: number;
  rules: RoadRules;
  roundNumber: number;
  roundWins: Record<PlayerId, number>;
  roundWinnerId: PlayerId | null;
  roundEndReason: RoadRoundEndReason | null;
  suddenDeath: boolean;
  safeBounds: ArenaBounds;
  damageMultiplier: number;
  cars: Record<PlayerId, CarState>;
  /** Seconds until this unordered car pair may deal authored ram damage again. */
  impactCooldowns: Record<string, number>;
  /** Seconds until a car may retrigger a tower or speed pad. */
  arenaCooldowns: Record<string, number>;
  events: RoadEvent[];
  winnerId: PlayerId | null;
}

export interface RoadPlayerSpec {
  id: PlayerId;
  vehicle: VehicleClass;
  isBot?: boolean;
  colorIndex?: number;
}

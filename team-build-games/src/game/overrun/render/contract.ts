/** Contract between the Overrun Phaser scene and whatever drives the match. */

import type { GunId, OverrunMode, PerkOffer, PlayerId, RawShooterInput, ShooterStatus, ShooterWorld } from "../types";
import type { PickupKind } from "../types";
import type { OverrunVisualAssets } from "../assets";

export interface OverrunMeta {
  name: string;
  colorIndex: number;
}

export interface OverrunDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number };
  getMeta(id: PlayerId): OverrunMeta;
}

export interface TeammateHud {
  id: PlayerId;
  name: string;
  colorIndex: number;
  status: ShooterStatus;
  health: number;
}

export interface OverrunHudState {
  countdown: number;
  health: number;
  maxHealth: number;
  status: ShooterStatus;
  gun: GunId;
  mag: number;
  /** null = infinite (pistol). */
  reserve: number | null;
  /** 0..1 of an active reload (0 = idle). */
  reloadFraction: number;
  wave: number;
  /** Match mode — drives whether the HUD shows a stage readout. */
  mode: OverrunMode;
  /** Current campaign stage (1-based); meaningless in survival. */
  stage: number;
  /** Total campaign stages, for the "STAGE n/N" readout. */
  stagesTotal: number;
  intermission: number;
  /** Campaign only: seconds left of the synced between-stage comic beat (0/absent = none). */
  stageIntroRemaining?: number;
  score: number;
  xp: number;
  xpNext: number;
  level: number;
  /** Head of the local player's offer queue (null = nothing to pick). */
  offer: PerkOffer | null;
  offersQueued: number;
  kills: number;
  teammates: TeammateHud[];
}

export type OverrunEvent =
  | { type: "tik"; n: number }
  | { type: "go" }
  | { type: "shot"; gun: GunId }
  | { type: "kill" }
  | { type: "pickup"; item: PickupKind }
  | { type: "levelup" }
  | { type: "downed"; local: boolean }
  | { type: "revived" }
  | { type: "gameover" }
  | { type: "enemyHit" }
  | { type: "playerHit"; local: boolean }
  | { type: "reload"; gun: GunId };

export interface OverrunConfig {
  driver: OverrunDriver;
  assets?: OverrunVisualAssets;
  onHud: (h: OverrunHudState) => void;
  onEvent: (e: OverrunEvent) => void;
  /** Fired once when the run ends, with the final world (scorecard + merch payload source). */
  onEnd: (world: ShooterWorld) => void;
}

import { botIntent } from "./bots";
import { MAX_CATCHUP_TICKS, ROAD_DT, ROUND_BREAK_S } from "./constants";
import { inputToDriveIntent } from "./intent";
import { createRoadWorld, startNextRoadRound } from "./match";
import type { DriveIntent, PlayerId, RawDriveInput, RoadRules, RoadWorld, VehicleClass } from "./types";
import type { RoadDriver, RoadPlayerMeta } from "./render/contract";
import { stepRoadWorld } from "./sim";

const LOCAL_ID = "driver";

const BOT_META: Record<string, string> = {
  "rival-1": "Crusher",
  "rival-2": "Wrench",
  "rival-3": "Mayhem",
};

export interface SoloRoadSnapshot {
  world: RoadWorld;
  countdownLeft: number;
  roundBreakLeft: number;
}

export class SoloRoadDriver implements RoadDriver {
  readonly localId = LOCAL_ID;
  private world: RoadWorld;
  private countdownLeft = 3;
  private roundBreakLeft = 0;
  private accumulator = 0;
  private readonly meta: Record<PlayerId, RoadPlayerMeta>;

  constructor(localVehicle: VehicleClass, restored?: SoloRoadSnapshot, rules: Partial<RoadRules> = {}) {
    const specs = [
      { id: LOCAL_ID, vehicle: localVehicle, isBot: false, colorIndex: 0 },
      { id: "rival-1", vehicle: "derby" as const, isBot: true, colorIndex: 1 },
      { id: "rival-2", vehicle: "monster" as const, isBot: true, colorIndex: 2 },
      { id: "rival-3", vehicle: "derby" as const, isBot: true, colorIndex: 3 },
    ];
    const freshWorld = createRoadWorld(specs, "last-madman", rules);
    this.world =
      restored?.world.mode === "last-madman" && restored.world.cars[LOCAL_ID]
        ? restored.world
        : freshWorld;
    this.countdownLeft = restored
      ? Math.max(0, Math.min(3, restored.countdownLeft))
      : 3;
    this.roundBreakLeft = restored
      ? Math.max(0, Math.min(ROUND_BREAK_S, restored.roundBreakLeft))
      : 0;
    this.meta = Object.fromEntries(
      specs.map((spec) => [
        spec.id,
        {
          name: spec.id === LOCAL_ID ? "You" : BOT_META[spec.id] ?? spec.id,
          colorIndex: spec.colorIndex,
          vehicle: spec.vehicle,
        },
      ]),
    );
  }

  getMeta(id: PlayerId): RoadPlayerMeta {
    const car = this.world.cars[id];
    return (
      this.meta[id] ?? {
        name: id.slice(0, 8),
        colorIndex: car?.colorIndex ?? 0,
        vehicle: car?.vehicle ?? "derby",
      }
    );
  }

  /** Serializable checkpoint used to survive local dev HMR / a browser refresh. */
  snapshot(): SoloRoadSnapshot {
    return {
      world: this.world,
      countdownLeft: this.countdownLeft,
      roundBreakLeft: this.roundBreakLeft,
    };
  }

  frame(dt: number, raw: RawDriveInput): { world: RoadWorld; countdown: number; roundBreak: number } {
    const safeDt = Math.max(0, Math.min(dt, 0.1));
    if (this.world.phase === "round-ended") {
      if (this.roundBreakLeft <= 0) this.roundBreakLeft = ROUND_BREAK_S;
      this.roundBreakLeft = Math.max(0, this.roundBreakLeft - safeDt);
      if (this.roundBreakLeft <= 0) {
        this.world = startNextRoadRound(this.world);
        this.countdownLeft = 3;
        return { world: this.world, countdown: 3, roundBreak: 0 };
      }
      return {
        world: this.world,
        countdown: 0,
        roundBreak: Math.ceil(this.roundBreakLeft),
      };
    }
    if (this.countdownLeft > 0) {
      this.countdownLeft = Math.max(0, this.countdownLeft - safeDt);
      return { world: this.world, countdown: Math.ceil(this.countdownLeft), roundBreak: 0 };
    }

    this.accumulator = Math.min(
      this.accumulator + safeDt,
      MAX_CATCHUP_TICKS * ROAD_DT,
    );
    while (this.accumulator >= ROAD_DT) {
      const intents: Record<PlayerId, DriveIntent> = {
        [this.localId]: inputToDriveIntent(raw),
      };
      for (const id of Object.keys(this.world.cars).sort()) {
        const car = this.world.cars[id]!;
        if (car.isBot) intents[id] = botIntent(this.world, car);
      }
      this.world = stepRoadWorld(this.world, intents, ROAD_DT);
      this.accumulator -= ROAD_DT;
    }
    if (this.world.phase === "round-ended") {
      this.roundBreakLeft = ROUND_BREAK_S;
      return {
        world: this.world,
        countdown: 0,
        roundBreak: Math.ceil(this.roundBreakLeft),
      };
    }
    return { world: this.world, countdown: 0, roundBreak: 0 };
  }
}

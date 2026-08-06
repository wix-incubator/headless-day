/**
 * Solo practice driver: local stepping vs host-style bots, same MatchDriver shape the netplay
 * Session implements — so the renderer is identical for practice and multiplayer.
 */

import type { Intent, PlayerId, RawInput, World } from "./types";
import { createWorld, evenSpawns } from "./match";
import { stepWorld } from "./sim";
import { initialMemory, inputToIntent } from "./intent";
import { botIntent } from "./bot";
import { COUNTDOWN_S } from "../constants";
import type { FramePacket, MatchDriver, PlayerMeta } from "./render/contract";
import { DEFAULT_SHAPE } from "./cosmetic";

const LOCAL = "you";

export class SoloDriver implements MatchDriver {
  readonly localId = LOCAL;
  private world: World;
  private mem = initialMemory();
  private countdownLeft = COUNTDOWN_S;
  private readonly botIds: PlayerId[];
  private readonly meta: Record<PlayerId, PlayerMeta>;

  constructor(botCount = 3) {
    const ids = [LOCAL, ...Array.from({ length: botCount }, (_, i) => `bot:${i + 1}`)];
    this.botIds = ids.slice(1);
    this.meta = Object.fromEntries(
      ids.map((id, i) => [id, { name: id === LOCAL ? "You" : `Bot ${i}`, shape: DEFAULT_SHAPE }]),
    );
    this.world = createWorld(evenSpawns(ids), "playing");
  }

  getMeta(id: PlayerId): PlayerMeta {
    return this.meta[id] ?? { name: id, shape: DEFAULT_SHAPE };
  }

  frame(dt: number, input: RawInput): FramePacket {
    if (this.countdownLeft > 0) {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      return { world: this.world, countdown: Math.ceil(this.countdownLeft) };
    }
    const { intent, memory } = inputToIntent(input, this.mem);
    this.mem = memory;
    const intents: Record<PlayerId, Intent> = { [LOCAL]: intent };
    for (const id of this.botIds) intents[id] = botIntent(id, this.world);
    this.world = stepWorld(this.world, intents, dt);
    return { world: this.world, countdown: 0 };
  }
}

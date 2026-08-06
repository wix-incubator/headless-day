// src/game/squid/net/session.ts
/**
 * Squid netplay session: Transport + warm-up roster + the generic host-authoritative
 * SyncEngine. Mirrors the arena Session's presence/explicit-host model (hello carries
 * hostId; `host` transfers; host-leave falls back to lowest-id election) — but rounds
 * are cooperative: no bots, no weapons, start needs only 1 player, and the "result"
 * is the shared octopus finishing (timed) or failing.
 */

import type { PlayerId } from "../types";
import type { Transport } from "../../net/transport";
import { coerceAvatarUrl, decode, encode } from "../../net/protocol";
import { decodeSquid, encodeSquid, type SquidStartPlayer } from "./protocol";
import { SyncEngine } from "./engine";
import { electHost } from "../../net/election";
import type { LobbyPlayer, Roster } from "../../net/lobby";
import { remove, rosterList, upsert } from "../../net/lobby";
import { DEFAULT_SHAPE } from "../../arena/cosmetic";
import { DEFAULT_WEAPON } from "../../arena/weapons";
import { COUNTDOWN_S } from "../../constants";
import { squidSyncAdapter } from "./adapter";
import { createSquidWorld, timeMsOf } from "../match";
import { initialSquidMemory, squidInputToIntent } from "../intent";
import { coerceStageId } from "../stage";
import type { RawSquidInput, RoundResult, SquidIntent, SquidWorld, StageId } from "../types";

export type SquidSessionPhase = "lobby" | "countdown" | "playing" | "ended";

export interface SquidSessionOptions {
  transport: Transport;
  name: string;
  iconColor: number;
  /** True for the peer that CREATED the room; it claims host (arena parity). */
  isCreator?: boolean;
  onChange: () => void;
}

const NO_INPUT: RawSquidInput = { left: false, right: false, lift: false, cycle: false, grabLeg: null };

export class SquidSession {
  readonly localId: PlayerId;
  private readonly t: Transport;
  private profile: LobbyPlayer;
  private roster: Roster = {};
  phase: SquidSessionPhase = "lobby";
  /** Coin-insert flag — every player in the room sees the start animation before the round begins. */
  starting = false;
  matchEpoch = 0;

  private explicitHostId: PlayerId | null = null;
  private engine: SyncEngine<SquidWorld, SquidIntent> | null = null;
  private initialWorld: SquidWorld | null = null;
  private stage: StageId = "stage1";
  private meta: Record<PlayerId, { name: string; colorIndex: number }> = {};
  private countdownLeft = 0;
  private mem = initialSquidMemory();
  private pendingRaw: RawSquidInput = NO_INPUT;

  constructor(private readonly opts: SquidSessionOptions) {
    this.t = opts.transport;
    this.localId = this.t.selfId;
    // LobbyPlayer carries shape/weapon for the arena; squid ignores them (defaults keep the wire valid).
    this.profile = { id: this.localId, name: opts.name, iconColor: opts.iconColor, shape: DEFAULT_SHAPE, weapon: DEFAULT_WEAPON, avatarUrl: null };
    this.roster = upsert({}, this.profile);
    if (opts.isCreator) this.explicitHostId = this.localId;

    this.t.onMessage((data, from) => this.onMessage(data, from));
    this.t.onPeerJoin(() => this.sendHello());
    this.t.onPeerLeave((id) => this.onPeerLeave(id));
    this.sendHello();
  }

  // ---- public state for the UI -------------------------------------------------

  getState() {
    const hostId = this.hostId();
    const world = this.engine?.getWorld() ?? null;
    return {
      localId: this.localId,
      phase: this.phase,
      starting: this.starting,
      matchEpoch: this.matchEpoch,
      roster: rosterList(this.roster),
      hostId,
      isHost: hostId === this.localId,
      stage: this.stage,
      result: (world?.result ?? null) as RoundResult,
      timeMs: world ? timeMsOf(world) : 0,
      playerIds: world?.playerIds ?? [],
    };
  }

  toLobby(): void {
    this.phase = "lobby";
    this.starting = false;
    this.engine = null;
    this.initialWorld = null;
    this.opts.onChange();
  }

  /** Host-only: broadcast "coin inserted" so all peers play the ~1s start animation before `start`. */
  signalCoin(): void {
    if (this.hostId() !== this.localId || this.starting) return;
    this.t.send(encode({ t: "coin" }));
    this.starting = true;
    this.opts.onChange();
  }

  setProfile(name: string, iconColor: number): void {
    this.profile = { ...this.profile, name, iconColor };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  /** Host-only: start a round on `stage` with the current roster (1+ players — solo allowed). */
  start(stage: StageId): void {
    if (this.hostId() !== this.localId) return;
    const players: SquidStartPlayer[] = rosterList(this.roster).map((p) => ({
      id: p.id,
      name: p.name,
      iconColor: p.iconColor ?? 0,
      avatarUrl: p.avatarUrl ?? null,
    }));
    if (players.length < 1) return;
    this.t.send(encodeSquid({ t: "squidStart", countdownMs: COUNTDOWN_S * 1000, stage, players }));
    this.beginRound(stage, players);
  }

  kick(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    this.t.send(encode({ t: "kick", targetId }));
    this.roster = remove(this.roster, targetId);
    this.opts.onChange();
  }

  /** Host-only: hand the host role to another connected player in the lobby. */
  makeHost(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    if (!(targetId in this.roster)) return;
    this.explicitHostId = targetId;
    this.t.send(encode({ t: "host", hostId: targetId }));
    this.opts.onChange();
  }

  leave(): void {
    this.t.close();
  }

  // ---- driver (renderer) --------------------------------------------------------

  getMeta(id: PlayerId): { name: string; colorIndex: number } {
    return this.meta[id] ?? { name: id.slice(0, 6), colorIndex: 0 };
  }

  frame(dt: number, input: RawSquidInput): { world: SquidWorld; countdown: number } {
    this.pendingRaw = input;
    const fallback = this.initialWorld ?? createSquidWorld(this.stage, [this.localId]);

    if (this.phase === "countdown") {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.opts.onChange();
      }
      return { world: fallback, countdown: Math.ceil(this.countdownLeft) };
    }

    if ((this.phase === "playing" || this.phase === "ended") && this.engine) {
      this.engine.tick(dt);
      const world = this.engine.getWorld();
      if (world.phase === "ended" && this.phase !== "ended") {
        this.phase = "ended";
        this.opts.onChange();
      }
      return { world, countdown: 0 };
    }

    return { world: fallback, countdown: 0 };
  }

  // ---- internals -----------------------------------------------------------------

  private hostId(): PlayerId | null {
    if (this.explicitHostId && [this.localId, ...this.t.getPeers()].includes(this.explicitHostId)) {
      return this.explicitHostId;
    }
    return electHost([this.localId, ...this.t.getPeers()]);
  }

  private onPeerLeave(id: PlayerId): void {
    const wasHost = id === this.hostId();
    this.roster = remove(this.roster, id);
    if (wasHost) {
      this.explicitHostId = null;
      if (electHost([this.localId, ...this.t.getPeers()]) === this.localId) {
        this.explicitHostId = this.localId;
        this.t.send(encode({ t: "host", hostId: this.localId }));
      }
    }
    this.opts.onChange();
  }

  private sendHello(): void {
    this.t.send(
      encode({
        t: "hello",
        name: this.profile.name,
        iconColor: this.profile.iconColor,
        shape: this.profile.shape,
        weapon: this.profile.weapon,
        avatarUrl: this.profile.avatarUrl,
        hostId: this.explicitHostId,
      }),
    );
  }

  private onMessage(data: string, from: PlayerId): void {
    // squid game traffic first (per-game protocol); squidInput/squidSnapshot are the engine's
    const sq = decodeSquid(data);
    if (sq) {
      if (sq.t === "squidStart") this.beginRound(coerceStageId(sq.stage), sq.players);
      return;
    }
    const m = decode(data);
    if (!m) return;
    switch (m.t) {
      case "hello": {
        const isNew = !(from in this.roster);
        this.roster = upsert(this.roster, {
          id: from,
          name: m.name,
          iconColor: m.iconColor ?? 0,
          shape: DEFAULT_SHAPE,
          weapon: DEFAULT_WEAPON,
          avatarUrl: coerceAvatarUrl(m.avatarUrl),
        });
        if (this.explicitHostId == null && m.hostId != null) this.explicitHostId = m.hostId;
        if (isNew) this.sendHello();
        this.opts.onChange();
        break;
      }
      case "host":
        this.explicitHostId = m.hostId;
        this.opts.onChange();
        break;
      case "coin":
        this.starting = true;
        this.opts.onChange();
        break;
      case "kick":
        if (m.targetId === this.localId) {
          this.leave();
          this.phase = "lobby";
          this.opts.onChange();
        }
        break;
      default:
        break; // squidInput/squidSnapshot are consumed by the SyncEngine's handler
    }
  }

  private beginRound(stage: StageId, players: SquidStartPlayer[]): void {
    this.starting = false;
    this.stage = stage;
    this.meta = Object.fromEntries(players.map((p) => [p.id, { name: p.name, colorIndex: p.iconColor }]));
    this.initialWorld = createSquidWorld(stage, players.map((p) => p.id));
    this.mem = initialSquidMemory();

    this.engine = new SyncEngine<SquidWorld, SquidIntent>({
      transport: this.t,
      localId: this.localId,
      world: this.initialWorld,
      adapter: squidSyncAdapter,
      readIntent: () => {
        const { intent, memory } = squidInputToIntent(this.pendingRaw, this.mem);
        this.mem = memory;
        return intent;
      },
      onWorld: () => {},
    });

    this.phase = "countdown";
    this.countdownLeft = COUNTDOWN_S;
    this.matchEpoch += 1;
    this.opts.onChange();
  }
}

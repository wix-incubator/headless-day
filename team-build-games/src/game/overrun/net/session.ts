// src/game/overrun/net/session.ts
/**
 * Overrun netplay session: Transport + warm-up roster + Overrun's own SyncEngine
 * (`./engine` — netcode is per-game), exposed as the renderer's OverrunDriver.
 * Mirrors the arena Session's presence + explicit-host model (hello/host/kick/leave),
 * minus rounds/bots/cosmetics — Overrun and Arena are separate games and share no
 * game-specific imports.
 *
 * Roster + hello use Overrun's own `oHello` message (no shape/weapon/iconColor
 * on the wire — colorIndex is DERIVED at match start from each player's index
 * in the host-ordered `oStart` players array, never transmitted separately).
 * `host`/`kick` stay on the shared lobby wire (`../../net/protocol`) — they're
 * game-neutral control messages, same as arena/squid use.
 *
 * The ONE permitted impurity in this file: `start()` mints the match seed with
 * Math.random() — it is broadcast in `oStart` and from then on all randomness
 * is the world-carried coordinate-hash.
 */

import type { PlayerId } from "../types";
import type { Transport } from "../../net/transport";
import { decode as decodeLobby, encode as encodeLobby } from "../../net/protocol";
import { decode, encode } from "./protocol";
import { SyncEngine } from "./engine";
import { electHost } from "../../net/election";
import { OVERRUN_COUNTDOWN_S, MAX_CATCHUP_TICKS, SHOOTER_DT, SNAPSHOT_INTERVAL_S, MAX_OVERRUN_PLAYERS } from "../constants";
import { initialShooterMemory, inputToShooterIntent } from "../intent";
import { createShooterWorld } from "../match";
import { overrunSyncAdapter } from "./adapter";
import { lerpWorlds } from "./interp";
import type { OverrunMode, RawShooterInput, ShooterIntent, ShooterWorld } from "../types";

export type OverrunPhase = "lobby" | "countdown" | "playing" | "ended" | "victory";

export interface OverrunSessionOptions {
  transport: Transport;
  name: string;
  isCreator?: boolean;
  onChange: () => void;
}

/** Overrun's own tiny warm-up roster — just presence, no cosmetics (those are arena's). */
interface OverrunRosterEntry {
  id: PlayerId;
  name: string;
}
type OverrunRoster = Record<PlayerId, OverrunRosterEntry>;

function upsertPlayer(roster: OverrunRoster, entry: OverrunRosterEntry): OverrunRoster {
  return { ...roster, [entry.id]: entry };
}

function removePlayer(roster: OverrunRoster, id: PlayerId): OverrunRoster {
  if (!(id in roster)) return roster;
  const next = { ...roster };
  delete next[id];
  return next;
}

/** Players sorted by id (stable display + the host's oStart order → colorIndex). */
function rosterList(roster: OverrunRoster): OverrunRosterEntry[] {
  return Object.values(roster).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const NO_INPUT: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

export class OverrunSession {
  readonly localId: PlayerId;
  phase: OverrunPhase = "lobby";
  /** Coin-insert flag — every player in the room sees the start animation before the match begins. */
  starting = false;
  /** True from the campaign-intro broadcast until the match begins — drives the synced intro comic. */
  introPlaying = false;
  matchEpoch = 0;

  private readonly t: Transport;
  private name: string;
  private roster: OverrunRoster = {};
  private explicitHostId: PlayerId | null = null;
  private engine: SyncEngine<ShooterWorld, ShooterIntent> | null = null;
  private initialWorld: ShooterWorld | null = null;
  private meta: Record<PlayerId, { name: string; colorIndex: number }> = {};
  private countdownLeft = 0;
  private mem = initialShooterMemory();
  private pendingRaw: RawShooterInput = NO_INPUT;
  private queuedPick: 0 | 1 | 2 | null = null;
  private acc = 0;
  // client interpolation state
  private prevSnap: ShooterWorld | null = null;
  private latestSnap: ShooterWorld | null = null;
  private latestTick = -1;
  private sinceLatest = 0;

  constructor(private readonly opts: OverrunSessionOptions) {
    this.t = opts.transport;
    this.localId = this.t.selfId;
    this.name = opts.name;
    this.roster = upsertPlayer({}, { id: this.localId, name: this.name });
    if (opts.isCreator) this.explicitHostId = this.localId; // the creator owns host until it transfers/leaves

    this.t.onMessage((data, from) => this.onMessage(data, from));
    this.t.onPeerJoin(() => this.sendHello()); // greet newcomers so they learn our profile + host
    this.t.onPeerLeave((id) => this.onPeerLeave(id));
    this.sendHello();
  }

  // ---- public state for the UI -------------------------------------------------

  getState() {
    const hostId = this.hostId();
    return {
      localId: this.localId,
      phase: this.phase,
      starting: this.starting,
      introPlaying: this.introPlaying,
      matchEpoch: this.matchEpoch,
      roster: rosterList(this.roster),
      hostId,
      isHost: hostId === this.localId,
    };
  }

  /** Host-only: broadcast "coin inserted" so all peers play the ~1s start animation before `start`. */
  signalCoin(): void {
    if (this.hostId() !== this.localId || this.starting) return;
    this.t.send(encodeLobby({ t: "coin" }));
    this.starting = true;
    this.opts.onChange();
  }

  /** Host-only: tell every peer to play the campaign intro comic before the match starts. */
  signalIntro(): void {
    if (this.hostId() !== this.localId || this.introPlaying) return;
    this.t.send(encode({ t: "oIntro" }));
    this.introPlaying = true;
    this.opts.onChange();
  }

  setProfile(name: string): void {
    this.name = name;
    this.roster = upsertPlayer(this.roster, { id: this.localId, name });
    this.sendHello();
    this.opts.onChange();
  }

  /** Host-only: start the run for the current roster with a freshly minted seed. */
  start(mode: OverrunMode = "survival"): void {
    if (this.hostId() !== this.localId) return;
    const players = rosterList(this.roster).map((p) => ({ id: p.id, name: p.name }));
    if (players.length < 1) return;
    if (players.length > MAX_OVERRUN_PLAYERS) return;
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const countdownMs = OVERRUN_COUNTDOWN_S * 1000;
    this.t.send(encode({ t: "oStart", countdownMs, seed, mode, players }));
    this.beginMatch(players, seed, countdownMs, mode);
  }

  /** HUD click path for a perk choice (keyboard 1/2/3 flows through RawShooterInput). */
  pickPerk(i: 0 | 1 | 2): void {
    this.queuedPick = i;
  }

  kick(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    this.t.send(encodeLobby({ t: "kick", targetId }));
    this.roster = removePlayer(this.roster, targetId);
    this.opts.onChange();
  }

  /** Host-only: hand the host role to another connected player in the lobby. */
  makeHost(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    if (!(targetId in this.roster)) return;
    this.explicitHostId = targetId;
    this.t.send(encodeLobby({ t: "host", hostId: targetId }));
    this.opts.onChange();
  }

  leave(): void {
    this.t.close();
  }

  /** Return to the warm-up room (after a match ends). */
  toLobby(): void {
    this.phase = "lobby";
    this.starting = false;
    this.introPlaying = false;
    this.engine = null;
    this.initialWorld = null;
    this.prevSnap = null;
    this.latestSnap = null;
    this.latestTick = -1;
    this.opts.onChange();
  }

  getMeta(id: PlayerId): { name: string; colorIndex: number } {
    return this.meta[id] ?? { name: id.slice(0, 6), colorIndex: 0 };
  }

  /** Advance the fixed-tick sim and return the world to RENDER (+ countdown). */
  frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number } {
    this.pendingRaw = input;

    if (this.phase === "countdown") {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.opts.onChange();
      }
      return { world: this.initialWorld ?? createShooterWorld([this.localId], 0), countdown: Math.ceil(this.countdownLeft) };
    }

    if ((this.phase === "playing" || this.phase === "ended" || this.phase === "victory") && this.engine) {
      this.acc = Math.min(this.acc + dt, MAX_CATCHUP_TICKS * SHOOTER_DT);
      while (this.acc >= SHOOTER_DT) {
        this.engine.tick(SHOOTER_DT);
        this.acc -= SHOOTER_DT;
      }
      const w = this.engine.getWorld();
      if (w.tick !== this.latestTick) {
        this.prevSnap = this.latestSnap;
        this.latestSnap = w;
        this.latestTick = w.tick;
        this.sinceLatest = 0;
      } else {
        this.sinceLatest += dt;
      }
      if ((w.phase === "ended" || w.phase === "victory") && this.phase === "playing") {
        this.phase = w.phase;
        this.opts.onChange();
      }
      const render = this.engine.isHost
        ? w
        : lerpWorlds(this.prevSnap, this.latestSnap ?? w, this.sinceLatest / SNAPSHOT_INTERVAL_S);
      return { world: render, countdown: 0 };
    }

    return { world: this.initialWorld ?? createShooterWorld([this.localId], 0), countdown: 0 };
  }

  // ---- internals ----------------------------------------------------------------

  private hostId(): PlayerId | null {
    // Explicit host when known; otherwise fall back to lowest-id election (bootstrap + migration).
    if (this.explicitHostId && [this.localId, ...this.t.getPeers()].includes(this.explicitHostId)) {
      return this.explicitHostId;
    }
    return electHost([this.localId, ...this.t.getPeers()]);
  }

  private onPeerLeave(id: PlayerId): void {
    // NB: by the time any peer-leave listener runs, LocalHub has already dropped `id` from
    // getPeers() everywhere, so `hostId()` below is already the POST-departure election —
    // `wasHost` can equal the departed id only via an explicit (not-yet-stale) claim, which
    // can't happen once the claim holder is excluded. Mirrors the arena Session exactly;
    // `hostId()`'s own election fallback is what keeps reads consistent even when this is false.
    const wasHost = id === this.hostId();
    this.roster = removePlayer(this.roster, id);
    if (wasHost) {
      // Host left → drop the stale claim so everyone falls back to lowest-id election (consistent),
      // then the newly-elected host re-claims + announces so late joiners adopt it too.
      this.explicitHostId = null;
      if (electHost([this.localId, ...this.t.getPeers()]) === this.localId) {
        this.explicitHostId = this.localId;
        this.t.send(encodeLobby({ t: "host", hostId: this.localId }));
      }
    }
    this.opts.onChange();
  }

  private sendHello(): void {
    this.t.send(encode({ t: "oHello", name: this.name, hostId: this.explicitHostId }));
  }

  private onMessage(data: string, from: PlayerId): void {
    // Try Overrun's own tags first (oHello/oStart/oInput/oSnap/oDelta — all "o"-prefixed);
    // fall back to the shared lobby wire for host/kick (game-neutral control messages).
    const om = decode(data);
    if (om) {
      switch (om.t) {
        case "oHello": {
          const isNew = !(from in this.roster);
          this.roster = upsertPlayer(this.roster, { id: from, name: om.name });
          // A joiner with no host yet adopts the sender's claimed host (creator/host propagation).
          if (this.explicitHostId == null && om.hostId != null) this.explicitHostId = om.hostId;
          if (isNew) this.sendHello(); // reply so the newcomer learns us + our host (bounded: first sight)
          this.opts.onChange();
          break;
        }
        case "oIntro":
          // Peer mirror of the host inserting the coin for a campaign match — show the intro comic.
          this.introPlaying = true;
          this.opts.onChange();
          break;
        case "oStart":
          this.beginMatch(om.players, om.seed, om.countdownMs, om.mode ?? "survival");
          break;
        default:
          break; // oInput/oSnap/oDelta are consumed by the SyncEngine's own handler
      }
      return;
    }
    const m = decodeLobby(data);
    if (!m) return;
    switch (m.t) {
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
        break;
    }
  }

  private beginMatch(players: { id: PlayerId; name: string }[], seed: number, countdownMs: number, mode: OverrunMode = "survival"): void {
    this.starting = false; // the coin-insert animation ends as the match world builds
    this.introPlaying = false; // and so does the campaign intro comic
    // colorIndex is DERIVED, never carried on the wire: it's each player's position
    // in this host-ordered array (host built it via rosterList — sorted by id).
    this.meta = Object.fromEntries(players.map((p, i) => [p.id, { name: p.name, colorIndex: i }]));
    this.initialWorld = createShooterWorld(players.map((p) => p.id), seed, mode);
    this.mem = initialShooterMemory();
    this.acc = 0;
    this.prevSnap = null;
    this.latestSnap = null;
    this.latestTick = -1;

    this.engine = new SyncEngine({
      transport: this.t,
      localId: this.localId,
      world: this.initialWorld,
      adapter: overrunSyncAdapter,
      readIntent: () => {
        const { intent, memory } = inputToShooterIntent(this.pendingRaw, this.mem);
        this.mem = memory;
        const perkPick = intent.perkPick ?? this.queuedPick;
        this.queuedPick = null;
        return { ...intent, perkPick };
      },
      onWorld: () => {},
    });

    this.phase = "countdown";
    this.countdownLeft = countdownMs / 1000;
    this.matchEpoch += 1;
    this.opts.onChange();
  }
}

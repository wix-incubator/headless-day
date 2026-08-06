/**
 * Netplay session: ties the Transport, the warm-up roster, and the host-authoritative
 * SyncEngine into one object that also serves as the renderer's MatchDriver.
 *
 * Presence model (simple + robust): every peer announces itself with `hello` on join and
 * whenever a new peer appears, so everyone accumulates the roster; departures drop on peer-leave.
 * Host (for Start/kick) = lowest connected id. On Start, the host broadcasts the ordered player
 * list (+ bots) so all peers build an identical world, then everyone runs a local countdown and
 * the SyncEngine takes over.
 */

import type {
  Intent,
  PlayerId,
  PlayerStats,
  RawInput,
  World,
} from "../arena/types";
import type { Transport } from "./transport";
import { coerceAvatarUrl, decode, encode, type StartPlayer } from "./protocol";
import { SyncEngine } from "./sync";
import { electHost } from "./election";
import { createWorld, evenSpawns } from "../arena/match";
import { createSurvivalMatchWorld } from "../arena/survival/step";
import {
  createRounds,
  nextRound,
  recordRoundWin,
  recordTiebreakWin,
  standings,
  type NextRound,
  type Placement,
  type RoundsState,
} from "../arena/rounds";
import { initialMemory, inputToIntent } from "../arena/intent";
import { botIntent } from "../arena/bot";
import { COUNTDOWN_S } from "../constants";
import type {
  FramePacket,
  MatchDriver,
  PlayerMeta,
} from "../arena/render/contract";
import type { LobbyPlayer, Roster } from "./lobby";
import { remove, rosterList, upsert } from "./lobby";
import {
  coercePremiumShapes,
  coerceShape,
  DEFAULT_SHAPE,
  playableShape,
  type Shape,
} from "../arena/cosmetic";
import { coerceWeapon, DEFAULT_WEAPON, playableWeapon, type Weapon } from "../arena/weapons";
import {
  coerceMode,
  DEFAULT_MODE,
  modeInfo,
  type GameMode,
} from "../arena/modes";

// "roundover" = a round finished and the host hasn't advanced yet (others wait); "ended" = final scoreboard.
export type SessionPhase =
  | "lobby"
  | "countdown"
  | "playing"
  | "roundover"
  | "ended";

/** Snapshot of standings shown on the round-over / finished overlays (host-authoritative). */
export interface Board {
  wins: Record<PlayerId, number>;
  roundNumber: number;
  rounds: number;
  final: boolean;
  podium: Placement[];
  stats: Record<PlayerId, PlayerStats>;
}

export interface SessionOptions {
  transport: Transport;
  name: string;
  shape: Shape;
  weapon: Weapon;
  /** Signed-in member's resolved Arena avatar (render-only); null for anonymous players. */
  avatarUrl?: string | null;
  /** Member-owned paid cosmetics; used by the host to sanitize match starts. */
  ownedPremiumShapes?: Shape[];
  /** True for the peer that CREATED the room (opened it with no `?room=`); it claims host. */
  isCreator?: boolean;
  /** Notified whenever roster/phase/host changes so React can re-render. */
  onChange: () => void;
}

const EMPTY_WORLD: World = {
  mode: DEFAULT_MODE,
  players: {},
  projectiles: [],
  phase: "lobby",
  tick: 0,
  winnerId: null,
};
const NO_INPUT: RawInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
  attack: false,
  block: false,
};

export class Session implements MatchDriver {
  readonly localId: PlayerId;
  private readonly t: Transport;
  private profile: LobbyPlayer;
  private roster: Roster = {};
  phase: SessionPhase = "lobby";
  /** True from coin-insert until the match begins — drives the shared coin-drop animation for all peers. */
  starting = false;
  /** Bumped on each match start so the UI can recreate the renderer cleanly. */
  matchEpoch = 0;

  /**
   * The authoritative host, explicitly owned rather than computed by id: the room CREATOR claims it,
   * joiners ADOPT it (via `hello`/`host` messages), and it can be transferred (`makeHost`). Null until
   * adopted — `hostId()` then falls back to lowest-id election (also the migration rule on host-leave).
   */
  private explicitHostId: PlayerId | null = null;
  private engine: SyncEngine | null = null;
  private initialWorld: World | null = null;
  private meta: Record<PlayerId, PlayerMeta> = {};
  private botIds: PlayerId[] = [];
  private countdownLeft = 0;
  private mem = initialMemory();
  private pendingRaw: RawInput = NO_INPUT;

  // ---- rounds (P8) — host owns the authoritative RoundsState; clients mirror via `standings` ----
  private rounds: RoundsState | null = null; // host-only
  private matchPlayers: StartPlayer[] = []; // full match roster, to rebuild sudden-death subsets
  private roundsTotal = 1;
  private roundNumber = 1;
  private roundTiebreak = false;
  private pendingNext: NextRound | null = null; // host: what "Next round" will do
  private cumulativeStats: Record<PlayerId, PlayerStats> = {}; // summed across rounds (host)
  private board: Board | null = null; // populated at each round's end (both host + clients)
  private mode: GameMode = DEFAULT_MODE;

  constructor(private readonly opts: SessionOptions) {
    this.t = opts.transport;
    this.localId = this.t.selfId;
    this.profile = {
      id: this.localId,
      name: opts.name,
      shape: opts.shape,
      weapon: opts.weapon,
      avatarUrl: opts.avatarUrl ?? null,
      ownedPremiumShapes: opts.ownedPremiumShapes ?? [],
    };
    this.roster = upsert({}, this.profile);
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
      matchEpoch: this.matchEpoch,
      roster: rosterList(this.roster),
      hostId,
      isHost: hostId === this.localId,
      winnerId: this.engine?.getWorld().winnerId ?? null,
      roundNumber: this.roundNumber,
      roundsTotal: this.roundsTotal,
      roundTiebreak: this.roundTiebreak,
      board: this.board,
      mode: this.mode,
    };
  }

  /** Return to the warm-up room (after a match ends). */
  toLobby(): void {
    this.phase = "lobby";
    this.starting = false;
    this.engine = null;
    this.initialWorld = null;
    this.rounds = null;
    this.board = null;
    this.pendingNext = null;
    this.cumulativeStats = {};
    this.opts.onChange();
  }

  setProfile(
    name: string,
    shape: Shape = this.profile.shape,
    weapon: Weapon = this.profile.weapon,
  ): void {
    this.profile = { ...this.profile, name, shape, weapon };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  setOwnedPremiumShapes(ownedPremiumShapes: Shape[]): void {
    this.profile = {
      ...this.profile,
      ownedPremiumShapes: coercePremiumShapes(ownedPremiumShapes),
    };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  setAvatarUrl(avatarUrl: string | null): void {
    this.profile = { ...this.profile, avatarUrl };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  /**
   * Host-only: broadcast "coin inserted" so every peer plays the ~1s start animation in the
   * warm-up room. The caller follows with `start(...)` after COIN_INSERT_MS — see the game island.
   */
  signalCoin(): void {
    if (this.hostId() !== this.localId || this.starting) return;
    this.t.send(encode({ t: "coin" }));
    this.starting = true;
    this.opts.onChange();
  }

  /** Host-only: start a best-of-`rounds` match with the current roster plus `botCount` bots. */
  start(
    botCount = 0,
    rounds = 1,
    requestedMode: GameMode = DEFAULT_MODE,
  ): void {
    if (this.hostId() !== this.localId) return;
    this.mode = modeInfo(requestedMode).available
      ? requestedMode
      : DEFAULT_MODE;
    const humans: StartPlayer[] = rosterList(this.roster).map((p) => ({
      id: p.id,
      name: p.name,
      shape: playableShape(p.shape, p.ownedPremiumShapes ?? [], p.id),
      weapon: playableWeapon(p.weapon, p.ownedPremiumShapes ?? []),
      avatarUrl: p.avatarUrl ?? null,
      ownedPremiumShapes: p.ownedPremiumShapes ?? [],
      isBot: false,
    }));
    const bots: StartPlayer[] = Array.from({ length: botCount }, (_, i) => ({
      id: `bot:${i + 1}`,
      name: `Bot ${i + 1}`,
      shape: DEFAULT_SHAPE,
      weapon: DEFAULT_WEAPON,
      isBot: true,
    }));
    const players = [...humans, ...bots];
    this.matchPlayers = players;
    this.roundsTotal = Math.max(1, Math.floor(rounds));
    this.rounds = createRounds(
      players.map((p) => p.id),
      this.roundsTotal,
    );
    this.cumulativeStats = {};
    this.board = null;
    this.startRound(players, 1, false);
  }

  /** Host-only: advance to the next regular round or sudden-death decider after a round ends. */
  nextRoundAction(): void {
    if (
      this.hostId() !== this.localId ||
      this.phase !== "roundover" ||
      !this.pendingNext
    )
      return;
    const nxt = this.pendingNext;
    this.pendingNext = null;
    if (nxt.kind === "tiebreak") {
      const tied = new Set(nxt.players);
      this.startRound(
        this.matchPlayers.filter((p) => tied.has(p.id)),
        this.roundNumber,
        true,
      );
    } else if (nxt.kind === "play") {
      this.startRound(this.matchPlayers, nxt.roundNumber, false);
    }
  }

  /** Host: broadcast the round's start (so peers build the same world) and begin it locally. */
  private startRound(
    players: StartPlayer[],
    roundNumber: number,
    tiebreak: boolean,
  ): void {
    this.t.send(
      encode({
        t: "start",
        countdownMs: COUNTDOWN_S * 1000,
        players,
        mode: this.mode,
        rounds: this.roundsTotal,
        roundNumber,
        tiebreak,
      }),
    );
    this.beginMatch(players, roundNumber, tiebreak);
  }

  kick(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    this.t.send(encode({ t: "kick", targetId }));
    this.roster = remove(this.roster, targetId);
    this.opts.onChange();
  }

  leave(): void {
    this.t.close();
  }

  // ---- MatchDriver (renderer) --------------------------------------------------

  getMeta(id: PlayerId): PlayerMeta {
    return this.meta[id] ?? { name: id.slice(0, 6), shape: DEFAULT_SHAPE };
  }

  frame(dt: number, input: RawInput): FramePacket {
    this.pendingRaw = input;

    if (this.phase === "countdown") {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.opts.onChange();
      }
      return {
        world: this.initialWorld ?? EMPTY_WORLD,
        countdown: Math.ceil(this.countdownLeft),
      };
    }

    if (
      (this.phase === "playing" ||
        this.phase === "roundover" ||
        this.phase === "ended") &&
      this.engine
    ) {
      this.engine.tick(dt);
      const world = this.engine.getWorld();
      // The tick a round resolves: host tallies + decides; clients wait for the host's standings.
      if (world.phase === "ended" && this.phase === "playing")
        this.onRoundEnd();
      return { world, countdown: 0 };
    }

    return { world: this.initialWorld ?? EMPTY_WORLD, countdown: 0 };
  }

  // ---- rounds lifecycle --------------------------------------------------------

  private onRoundEnd(): void {
    if (this.hostId() === this.localId) this.handleRoundEndHost();
    else {
      // Client: freeze on the result and wait for the host's `standings` (which sets the real phase).
      this.phase = "roundover";
      this.opts.onChange();
    }
  }

  /** Host: fold in this round's stats, record the win, then either wait (roundover) or finish (ended). */
  private handleRoundEndHost(): void {
    const w = this.engine!.getWorld();
    for (const p of Object.values(w.players)) {
      const c = this.cumulativeStats[p.id] ?? {
        hits: 0,
        misses: 0,
        distance: 0,
      };
      this.cumulativeStats[p.id] = {
        hits: c.hits + p.stats.hits,
        misses: c.misses + p.stats.misses,
        distance: c.distance + p.stats.distance,
      };
    }
    if (this.rounds) {
      this.rounds = this.roundTiebreak
        ? recordTiebreakWin(this.rounds, w.winnerId)
        : recordRoundWin(this.rounds, w.winnerId);
    }
    const nxt: NextRound = this.rounds
      ? nextRound(this.rounds)
      : { kind: "done", podium: [] };
    const final = nxt.kind === "done";
    this.pendingNext = final ? null : nxt;
    this.board = {
      wins: this.rounds ? { ...this.rounds.wins } : {},
      roundNumber: this.roundNumber,
      rounds: this.roundsTotal,
      final,
      podium:
        nxt.kind === "done"
          ? nxt.podium
          : this.rounds
            ? standings(this.rounds)
            : [],
      stats: { ...this.cumulativeStats },
    };
    this.phase = final ? "ended" : "roundover";
    this.t.send(
      encode({
        t: "standings",
        wins: this.board.wins,
        roundNumber: this.roundNumber,
        rounds: this.roundsTotal,
        phase: final ? "ended" : "roundover",
        podium: this.board.podium,
        stats: this.board.stats,
      }),
    );
    this.opts.onChange();
  }

  // ---- internals ---------------------------------------------------------------

  private hostId(): PlayerId | null {
    // Explicit host when known; otherwise fall back to lowest-id election (bootstrap + migration).
    if (
      this.explicitHostId &&
      [this.localId, ...this.t.getPeers()].includes(this.explicitHostId)
    ) {
      return this.explicitHostId;
    }
    return electHost([this.localId, ...this.t.getPeers()]);
  }

  /** Host-only: hand the host role to another connected player in the lobby. */
  makeHost(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    if (!(targetId in this.roster)) return;
    this.explicitHostId = targetId;
    this.t.send(encode({ t: "host", hostId: targetId }));
    this.opts.onChange();
  }

  private onPeerLeave(id: PlayerId): void {
    const wasHost = id === this.hostId();
    this.roster = remove(this.roster, id);
    if (wasHost) {
      // Host left → drop the stale claim so everyone falls back to lowest-id election (consistent),
      // then the newly-elected host re-claims + announces so late joiners adopt it too.
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
        shape: this.profile.shape,
        weapon: this.profile.weapon,
        avatarUrl: this.profile.avatarUrl,
        ownedPremiumShapes: this.profile.ownedPremiumShapes ?? [],
        hostId: this.explicitHostId,
      }),
    );
  }

  private onMessage(data: string, from: PlayerId): void {
    const m = decode(data);
    if (!m) return;
    switch (m.t) {
      case "hello": {
        const isNew = !(from in this.roster);
        this.roster = upsert(this.roster, {
          id: from,
          name: m.name,
          shape: coerceShape(m.shape),
          weapon: coerceWeapon(m.weapon),
          avatarUrl: coerceAvatarUrl(m.avatarUrl),
          ownedPremiumShapes: coercePremiumShapes(m.ownedPremiumShapes),
        });
        // A joiner with no host yet adopts the sender's claimed host (creator/host propagation).
        if (this.explicitHostId == null && m.hostId != null)
          this.explicitHostId = m.hostId;
        if (isNew) this.sendHello(); // reply so the newcomer learns us + our host (bounded: first sight)
        this.opts.onChange();
        break;
      }
      case "host":
        this.explicitHostId = m.hostId;
        this.opts.onChange();
        break;
      case "kick":
        if (m.targetId === this.localId) {
          this.leave();
          this.phase = "lobby";
          this.opts.onChange();
        }
        break;
      case "coin":
        // Peer mirror of the host inserting the coin — show the start animation in the room.
        this.starting = true;
        this.opts.onChange();
        break;
      case "start":
        // Client mirrors each round the host starts (host-authoritative RoundsState stays host-side).
        this.mode = coerceMode(m.mode);
        if (!modeInfo(this.mode).available) this.mode = DEFAULT_MODE;
        this.matchPlayers = m.players;
        this.roundsTotal = m.rounds ?? 1;
        this.board = null;
        this.beginMatch(m.players, m.roundNumber ?? 1, m.tiebreak ?? false);
        break;
      case "standings":
        // Client mirror of the host's round-end board (tally + podium + stats).
        this.board = {
          wins: m.wins,
          roundNumber: m.roundNumber,
          rounds: m.rounds,
          final: m.phase === "ended",
          podium: m.podium ?? [],
          stats: m.stats ?? {},
        };
        this.phase = m.phase; // "roundover" | "ended"
        this.opts.onChange();
        break;
      default:
        break; // input/snapshot are consumed by the SyncEngine's own handler
    }
  }

  private beginMatch(
    players: StartPlayer[],
    roundNumber = 1,
    tiebreak = false,
  ): void {
    this.starting = false; // the coin-insert animation ends as the match world builds
    this.roundNumber = roundNumber;
    this.roundTiebreak = tiebreak;
    const ids = players.map((p) => p.id);
    this.meta = Object.fromEntries(
      players.map((p) => [
        p.id,
        { name: p.name, shape: p.shape, avatarUrl: p.avatarUrl ?? null },
      ]),
    );
    this.botIds = players.filter((p) => p.isBot).map((p) => p.id);
    // Zip the deterministic spawn ring with each player's equipped weapon (same order as ids).
    const spawns = evenSpawns(ids).map((s, i) => ({
      ...s,
      weapon: players[i]!.weapon,
    }));
    // Coop Survival centers the party and host-seeds the wave RNG once; the seed rides snapshots to
    // peers + a migrating host (clients never step, so their pre-first-snapshot seed is irrelevant).
    this.initialWorld =
      modeInfo(this.mode).rules === "survival"
        ? createSurvivalMatchWorld(ids, this.mode, { seed: Math.floor(Math.random() * 0x7fffffff) })
        : createWorld(spawns, "playing", this.mode);
    this.mem = initialMemory();

    this.engine = new SyncEngine({
      transport: this.t,
      localId: this.localId,
      world: this.initialWorld,
      readIntent: () => {
        const { intent, memory } = inputToIntent(this.pendingRaw, this.mem);
        this.mem = memory;
        return intent;
      },
      onWorld: () => {},
      hostExtraIntents: () => {
        const w = this.engine!.getWorld();
        const out: Record<PlayerId, Intent> = {};
        for (const id of this.botIds) out[id] = botIntent(id, w);
        return out;
      },
    });

    this.phase = "countdown";
    this.countdownLeft = COUNTDOWN_S;
    this.matchEpoch += 1;
    this.opts.onChange();
  }
}

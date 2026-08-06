/**
 * Pure, versioned wire protocol. JSON envelope for now (correctness-first); binary packing
 * is a later optimization. `coerceIntent` is the trust boundary — the host runs every remote
 * input through it so a peer can only ever send well-formed *intent bits*, never positions/health.
 */

import type {
  Direction,
  Intent,
  PlayerId,
  PlayerStats,
  Projectile,
  World,
} from "../arena/types";
import type { Shape } from "../arena/cosmetic";
import type { Weapon } from "../arena/weapons";
import type { Placement } from "../arena/rounds";
import type { GameMode } from "../arena/modes";
import { DEFAULT_MODE } from "../arena/modes";
import { coerceEnemy } from "../arena/survival/enemy";
import { coerceSurvivalState } from "../arena/survival/snapshot";

export const PROTOCOL_VERSION = 4;

export interface RosterEntry {
  id: PlayerId;
  name: string;
  shape: Shape;
  weapon: Weapon;
  avatarUrl?: string | null;
  ownedPremiumShapes?: Shape[];
  alive: boolean;
}

/** A participant in a starting match (humans + host-controlled bots). */
export interface StartPlayer {
  id: PlayerId;
  name: string;
  shape: Shape;
  weapon: Weapon;
  avatarUrl?: string | null;
  ownedPremiumShapes?: Shape[];
  isBot: boolean;
}

export type NetMessage =
  | {
      t: "hello";
      name: string;
      iconColor?: number;
      shape: Shape;
      weapon: Weapon;
      avatarUrl?: string | null;
      ownedPremiumShapes?: Shape[];
      hostId?: PlayerId | null;
    }
  | { t: "roster"; hostId: PlayerId; players: RosterEntry[] }
  | { t: "kick"; targetId: PlayerId }
  // Explicit host assignment/transfer/migration — receivers adopt `hostId` as the authoritative host.
  | { t: "host"; hostId: PlayerId }
  // P8 round fields are optional so a plain single-match `start` (rounds=1, today's behaviour) still validates.
  | {
      t: "start";
      countdownMs: number;
      players: StartPlayer[];
      mode?: GameMode;
      rounds?: number;
      roundNumber?: number;
      tiebreak?: boolean;
    }
  // Host → peers at each round's end: running tally + standings/stats. `phase` is "roundover"
  // (host will advance) or "ended" (final scoreboard). `podium` + `stats` drive the overlays.
  | {
      t: "standings";
      wins: Record<PlayerId, number>;
      roundNumber: number;
      rounds: number;
      phase: "roundover" | "ended";
      podium?: Placement[];
      stats?: Record<PlayerId, PlayerStats>;
    }
  // Host → peers when the coin is inserted: everyone plays the "insert coin" start
  // animation in the warm-up room for ~1s before the host follows with `start`.
  | { t: "coin" }
  | { t: "input"; tick: number; intent: Intent }
  | {
      t: "snapshot";
      tick: number;
      phase: World["phase"];
      winnerId: PlayerId | null;
      mode?: GameMode;
      players: World["players"];
      projectiles: Projectile[];
      /** Coop Survival only: host-simulated enemies + campaign state (absent in versus). */
      enemies?: World["enemies"];
      survival?: World["survival"];
    }
  | { t: "event"; kind: string; targetId?: PlayerId }
  | { t: "ping"; sentAt: number }
  | { t: "pong"; sentAt: number; hostTick: number }
  | { t: "leave" };

export function encode(m: NetMessage): string {
  return JSON.stringify({ v: PROTOCOL_VERSION, m });
}

/** Parse a wire string, returning null on garbage or a version mismatch. */
export function decode(s: string): NetMessage | null {
  try {
    const o = JSON.parse(s) as { v?: number; m?: { t?: unknown } };
    if (o && o.v === PROTOCOL_VERSION && o.m && typeof o.m.t === "string") {
      return o.m as NetMessage;
    }
  } catch {
    /* fall through */
  }
  return null;
}

const MAX_AVATAR_URL_LEN = 512;

/**
 * Sanitize an untrusted avatar URL from a peer (cosmetic trust boundary). Only https URLs of a
 * sane length are accepted — everything else (data:/javascript:/http:/oversized) becomes null so a
 * peer can't make a viewer's browser fetch an arbitrary resource. The image is used only as a texture.
 */
export function coerceAvatarUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (url.length === 0 || url.length > MAX_AVATAR_URL_LEN) return null;
  return url.startsWith("https://") ? url : null;
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** Sanitize an untrusted intent into a well-formed one (the host's anti-cheat boundary). */
export function coerceIntent(raw: unknown): Intent {
  const i = (raw ?? {}) as Partial<Intent> & { move?: Partial<Intent["move"]> };
  const m: Partial<Intent["move"]> = i.move ?? {};
  const facing = DIRECTIONS.includes(i.facing as Direction)
    ? (i.facing as Direction)
    : "down";
  const aim = Number.isFinite(i.aim) ? (i.aim as number) : undefined;
  return {
    move: { up: !!m.up, down: !!m.down, left: !!m.left, right: !!m.right },
    facing,
    aim,
    dash: !!i.dash,
    attack: !!i.attack,
    block: !!i.block,
  };
}

/** Build a World from a snapshot message. Survival fields ride through their trust boundary. */
export function worldFromSnapshot(
  m: Extract<NetMessage, { t: "snapshot" }>,
): World {
  const world: World = {
    mode: m.mode ?? DEFAULT_MODE,
    players: m.players,
    projectiles: m.projectiles,
    phase: m.phase,
    tick: m.tick,
    winnerId: m.winnerId,
  };
  // Coop Survival: sanitize the host-owned enemy list + campaign block (a bad host can't fork peers).
  if (m.survival) {
    world.enemies = Array.isArray(m.enemies) ? m.enemies.map(coerceEnemy) : [];
    world.survival = coerceSurvivalState(m.survival);
  }
  return world;
}

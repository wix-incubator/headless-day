// src/game/overrun/net/adapter.ts
/**
 * Overrun's SyncAdapter: plugs stepShooter + the quantized keyframe/delta codec
 * into Overrun's own SyncEngine (`./engine` — netcode is per-game; see its header).
 * Cadence: broadcast every SNAPSHOT_EVERY_TICKS ticks; keyframe when there's no
 * delta base or on the KEYFRAME_EVERY schedule.
 */

import type { PeerId } from "../../net/transport";
import type { SyncAdapter } from "./engine";
import { decode, encode } from "./protocol";
import { electHost } from "../../net/election";
import { KEYFRAME_EVERY, SNAPSHOT_EVERY_TICKS } from "../constants";
import { coerceShooterIntent } from "../intent";
import { stepShooter } from "../sim";
import { applyDelta, diffWorld, qWorld, unqWorld, type ODelta, type QWorld } from "./codec";
import type { ShooterIntent, ShooterWorld } from "../types";

export const overrunSyncAdapter: SyncAdapter<ShooterWorld, ShooterIntent> = {
  step: stepShooter,
  coerceIntent: coerceShooterIntent,
  encodeInput: (_w, intent) => encode({ t: "oInput", intent }),
  encodeSnapshot: (w, prevSent) => {
    // Frozen-tick guard: once the world stops advancing (phase "ended"), repeated
    // calls see the exact same tick+phase as last broadcast — skip, don't spam.
    if (prevSent !== null && prevSent.tick === w.tick && prevSent.phase === w.phase) return null;
    // Phase-transition guard: a phase flip (e.g. → "ended") must reach clients even
    // off the snapshot cadence, or a wipe landing on a non-boundary tick never ships
    // and clients hang in the old phase forever. Force a keyframe.
    if (prevSent !== null && prevSent.phase !== w.phase) {
      return encode({ t: "oSnap", w: qWorld(w) });
    }
    if (w.tick % SNAPSHOT_EVERY_TICKS !== 0 || w.tick === 0) return null;
    const snapIndex = w.tick / SNAPSHOT_EVERY_TICKS;
    if (prevSent === null || snapIndex % KEYFRAME_EVERY === 0) {
      return encode({ t: "oSnap", w: qWorld(w) });
    }
    return encode({ t: "oDelta", d: diffWorld(qWorld(prevSent), qWorld(w)) });
  },
  decodeMessage: (data) => {
    const m = decode(data);
    if (!m) return null;
    if (m.t === "oInput") return { kind: "input", intent: m.intent };
    if (m.t === "oSnap") return { kind: "snapshot", world: unqWorld(m.w as QWorld) };
    if (m.t === "oDelta") return { kind: "update", apply: (prev: ShooterWorld) => applyDelta(prev, m.d as ODelta) };
    return null;
  },
  electHost: (w, connected: PeerId[]) => {
    const present = connected.filter((id) => w.players[id] && w.players[id]!.status !== "dead");
    return electHost(present.length > 0 ? present : [...connected]);
  },
  onPeerLeave: (w, id) =>
    w.players[id] && w.players[id]!.status !== "dead"
      ? { ...w, players: { ...w.players, [id]: { ...w.players[id]!, status: "dead", health: 0 } } }
      : w,
};

/**
 * Host-authoritative sync engine — one per peer, driven by explicit `tick(dt)` calls
 * (no internal timer, so it's deterministic and unit-testable under a LocalHub).
 *
 * Every peer independently elects the host = lowest ALIVE & connected id (./election), so
 * migration needs no negotiation. The host runs the canonical `stepWorld` and broadcasts
 * snapshots; clients send inputs only (sanitized via `coerceIntent` — the anti-cheat boundary)
 * and render the latest snapshot. When the host dies or leaves, the next-lowest peer already
 * holds that snapshot and seamlessly takes over.
 */

import type { Intent, PlayerId, World } from "../arena/types";
import { stepWorld } from "../arena/sim";
import type { PeerId, Transport } from "./transport";
import { coerceIntent, decode, encode, worldFromSnapshot } from "./protocol";
import { electHostForWorld } from "./election";

export interface SyncOptions {
  transport: Transport;
  localId: PeerId;
  /** Initial canonical world (host seeds from it; clients hold it until the first snapshot). */
  world: World;
  /** Local input for this tick (e.g. from the keyboard adapter). */
  readIntent: () => Intent;
  /** Called every tick with the world to render (canonical on host, latest snapshot on clients). */
  onWorld: (world: World) => void;
  /** Host only: extra intents for non-peer entities the host simulates (e.g. bots). */
  hostExtraIntents?: () => Record<PlayerId, Intent>;
}

export class SyncEngine {
  private world: World;
  private hostId: PeerId | null;
  /** Host buffer: latest intent received per peer (rate-limited to one-per-tick by overwrite). */
  private inputs = new Map<PeerId, Intent>();

  constructor(private readonly opts: SyncOptions) {
    this.world = opts.world;
    this.hostId = this.computeHost();
    opts.transport.onMessage((data, from) => this.onMessage(data, from));
    opts.transport.onPeerLeave((id) => this.onPeerLeave(id));
  }

  private onPeerLeave(id: PeerId): void {
    this.inputs.delete(id);
    // The host removes a departed player from the canonical world so the match can resolve
    // (their figure simply dies — the renderer plays the usual disappear, win re-checks).
    if (this.isHost && this.world.players[id]?.status === "alive") {
      const players = { ...this.world.players };
      players[id] = { ...players[id]!, status: "dead", attack: null, health: 0 };
      this.world = { ...this.world, players };
    }
  }

  get isHost(): boolean {
    return this.hostId === this.opts.localId;
  }

  getHostId(): PeerId | null {
    return this.hostId;
  }

  getWorld(): World {
    return this.world;
  }

  /** Advance one frame: (re)elect host, then host-step + broadcast, or client send-input. */
  tick(dt: number): void {
    this.hostId = this.computeHost();
    const intent = this.opts.readIntent();

    if (this.isHost) {
      this.inputs.set(this.opts.localId, intent);
      const intents = { ...this.opts.hostExtraIntents?.(), ...Object.fromEntries(this.inputs) };
      this.world = stepWorld(this.world, intents, dt);
      this.opts.transport.send(
        encode({
          t: "snapshot",
          tick: this.world.tick,
          phase: this.world.phase,
          winnerId: this.world.winnerId,
          mode: this.world.mode,
          players: this.world.players,
          projectiles: this.world.projectiles,
          enemies: this.world.enemies,
          survival: this.world.survival,
        }),
      );
      this.opts.onWorld(this.world);
    } else {
      this.opts.transport.send(
        encode({ t: "input", tick: this.world.tick, intent }),
        this.hostId ?? undefined,
      );
      this.opts.onWorld(this.world);
    }
  }

  private onMessage(data: string, from: PeerId): void {
    const m = decode(data);
    if (!m) return;
    if (m.t === "input" && this.isHost) {
      // sanitize untrusted input (anti-cheat): peers can only send well-formed intent bits
      this.inputs.set(from, coerceIntent(m.intent));
    } else if (m.t === "snapshot" && !this.isHost) {
      this.world = worldFromSnapshot(m);
    }
  }

  private computeHost(): PeerId | null {
    const connected = [this.opts.localId, ...this.opts.transport.getPeers()];
    return electHostForWorld(this.world, connected);
  }
}

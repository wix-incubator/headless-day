/**
 * Squid-owned host-authoritative sync engine — one per peer, driven by explicit
 * `tick(dt)` calls (no internal timer, so it's deterministic and unit-testable
 * under a LocalHub).
 *
 * NETCODE IS PER GAME: the arena has its own engine in `src/game/net/sync.ts`;
 * this one is generic over the world/intent types via an injected `SyncAdapter`
 * so future games can reuse it without touching arena files. Only the transport
 * layer (`src/game/net/transport.ts`, rtc, election, lobby, roomLink) is shared.
 */

import type { PlayerId } from "../types";
import type { PeerId, Transport } from "../../net/transport";

/**
 * Host broadcast cadence cap. Render/stepping stays per-frame (60-120 Hz); only the
 * snapshot broadcast is throttled — a rope-leg snapshot is ~14 KB, so at 20 Hz that's
 * ~2.3 Mbps per client, versus up to ~47 Mbps host upload in an 8-player round if every
 * render frame were broadcast.
 */
const SNAPSHOT_INTERVAL_S = 1 / 20;

/** Everything game-specific the engine needs. Implementations must be pure/stateless. */
export interface SyncAdapter<W, I> {
  step(world: W, intents: Record<PlayerId, I>, dt: number): W;
  /** Anti-cheat boundary: sanitize an untrusted wire intent. */
  coerceIntent(raw: unknown): I;
  encodeInput(world: W, intent: I): string;
  encodeSnapshot(world: W): string;
  /** Decode a wire message addressed to this engine; null → not ours (lobby traffic etc.). */
  decodeMessage(data: string): { kind: "input"; intent: unknown } | { kind: "snapshot"; world: W } | null;
  electHost(world: W, connected: PeerId[]): PeerId | null;
  /** Host-side: fold a departed peer into the world (squid: release their leg). */
  onPeerLeave?(world: W, id: PeerId): W;
}

export interface SyncOptions<W, I> {
  transport: Transport;
  localId: PeerId;
  /** Initial canonical world (host seeds from it; clients hold it until the first snapshot). */
  world: W;
  adapter: SyncAdapter<W, I>;
  /** Local input for this tick (e.g. from the keyboard adapter). */
  readIntent: () => I;
  /** Called every tick with the world to render (canonical on host, latest snapshot on clients). */
  onWorld: (world: W) => void;
  /** Host only: extra intents for non-peer entities the host simulates. */
  hostExtraIntents?: () => Record<PlayerId, I>;
}

export class SyncEngine<W, I> {
  private world: W;
  private hostId: PeerId | null;
  /** Host buffer: latest intent received per peer (rate-limited to one-per-tick by overwrite). */
  private inputs = new Map<PeerId, I>();
  /**
   * Seeded to the interval so the host's very first tick of a round sends a snapshot
   * immediately (late joiners/clients shouldn't be blank for 50 ms). On every send we
   * subtract (not zero) the interval, which keeps the average broadcast cadence exact.
   */
  private snapshotAccum = SNAPSHOT_INTERVAL_S;

  constructor(private readonly opts: SyncOptions<W, I>) {
    this.world = opts.world;
    this.hostId = this.computeHost();
    opts.transport.onMessage((data, from) => this.onMessage(data, from));
    opts.transport.onPeerLeave((id) => this.onPeerLeave(id));
  }

  private onPeerLeave(id: PeerId): void {
    this.inputs.delete(id);
    if (this.isHost && this.opts.adapter.onPeerLeave) {
      this.world = this.opts.adapter.onPeerLeave(this.world, id);
    }
  }

  get isHost(): boolean {
    return this.hostId === this.opts.localId;
  }

  getHostId(): PeerId | null {
    return this.hostId;
  }

  getWorld(): W {
    return this.world;
  }

  /** Advance one frame: (re)elect host, then host-step + broadcast, or client send-input. */
  tick(dt: number): void {
    this.hostId = this.computeHost();
    const intent = this.opts.readIntent();

    if (this.isHost) {
      this.inputs.set(this.opts.localId, intent);
      const intents = { ...this.opts.hostExtraIntents?.(), ...Object.fromEntries(this.inputs) };
      this.world = this.opts.adapter.step(this.world, intents, dt);
      this.snapshotAccum += dt;
      if (this.snapshotAccum >= SNAPSHOT_INTERVAL_S) {
        this.snapshotAccum -= SNAPSHOT_INTERVAL_S;
        this.opts.transport.send(this.opts.adapter.encodeSnapshot(this.world));
      }
      this.opts.onWorld(this.world);
    } else {
      this.opts.transport.send(
        this.opts.adapter.encodeInput(this.world, intent),
        this.hostId ?? undefined,
      );
      this.opts.onWorld(this.world);
    }
  }

  private onMessage(data: string, from: PeerId): void {
    const m = this.opts.adapter.decodeMessage(data);
    if (!m) return;
    if (m.kind === "input" && this.isHost) {
      this.inputs.set(from, this.opts.adapter.coerceIntent(m.intent));
    } else if (m.kind === "snapshot" && !this.isHost) {
      this.world = m.world;
    }
  }

  private computeHost(): PeerId | null {
    const connected = [this.opts.localId, ...this.opts.transport.getPeers()];
    return this.opts.adapter.electHost(this.world, connected);
  }
}

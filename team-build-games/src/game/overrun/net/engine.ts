/**
 * Overrun-owned host-authoritative sync engine — one per peer, driven by explicit `tick(dt)`
 * calls (no internal timer, so it's deterministic and unit-testable under a LocalHub).
 *
 * NETCODE IS PER GAME: the arena has its own engine in `src/game/net/sync.ts`; squid has its own
 * in `src/game/squid/net/engine.ts`; this is Overrun's own copy so it can carry Overrun-specific
 * extensions (snapshot cadence + delta encoding + the `update` message kind, and a host-election
 * refresh fix in `onPeerLeave`) without touching any other game's netcode. Only the transport layer
 * (`src/game/net/transport.ts`, rtc, election, lobby, roomLink) is shared.
 */

import type { PeerId, Transport } from "../../net/transport";

/** Everything game-specific the engine needs. Implementations must be pure/stateless. */
export interface SyncAdapter<W, I> {
  step(world: W, intents: Record<PeerId, I>, dt: number): W;
  /** Anti-cheat boundary: sanitize an untrusted wire intent. */
  coerceIntent(raw: unknown): I;
  encodeInput(world: W, intent: I): string;
  /**
   * Encode the outbound broadcast for this tick, or null to skip (cadence control).
   * `prevSent` is the last world actually broadcast by THIS peer (delta base;
   * null before the first broadcast and right after host migration → keyframe).
   */
  encodeSnapshot(world: W, prevSent: W | null): string | null;
  /** Decode a wire message addressed to this engine; null → not ours (lobby traffic etc.). */
  decodeMessage(
    data: string,
  ):
    | { kind: "input"; intent: unknown }
    | { kind: "snapshot"; world: W }
    | { kind: "update"; apply: (prev: W) => W }
    | null;
  electHost(world: W, connected: PeerId[]): PeerId | null;
  /** Host-side: fold a departed peer into the world (Overrun: mark their player dead). */
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
  /** Host only: extra intents for non-peer entities the host simulates (e.g. bots). */
  hostExtraIntents?: () => Record<PeerId, I>;
}

export class SyncEngine<W, I> {
  private world: W;
  private hostId: PeerId | null;
  /** Host buffer: latest intent received per peer (rate-limited to one-per-tick by overwrite). */
  private inputs = new Map<PeerId, I>();
  /** Last world actually broadcast by this peer (the delta base). */
  private lastSent: W | null = null;

  constructor(private readonly opts: SyncOptions<W, I>) {
    this.world = opts.world;
    this.hostId = this.computeHost();
    opts.transport.onMessage((data, from) => this.onMessage(data, from));
    opts.transport.onPeerLeave((id) => this.onPeerLeave(id));
  }

  private onPeerLeave(id: PeerId): void {
    // Refresh the host cache before gating on it — it's only otherwise refreshed inside
    // tick(), so it can be stale at leave-fire time. The departed peer is already gone
    // from getPeers(), so this recomputes who the new host is (possibly us).
    this.hostId = this.computeHost();
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
      const payload = this.opts.adapter.encodeSnapshot(this.world, this.lastSent);
      if (payload !== null) {
        this.opts.transport.send(payload);
        this.lastSent = this.world;
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
    } else if (m.kind === "update" && !this.isHost) {
      this.world = m.apply(this.world);
    }
  }

  private computeHost(): PeerId | null {
    const connected = [this.opts.localId, ...this.opts.transport.getPeers()];
    return this.opts.adapter.electHost(this.world, connected);
  }
}

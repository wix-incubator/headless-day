/**
 * Transport abstraction so the sync engine never touches WebRTC directly.
 * Production uses the Trystero adapter (./rtc); tests use the in-memory LocalHub here,
 * which connects several endpoints in one process for deterministic multi-"peer" tests.
 *
 * Modelled on Trystero's shape: broadcast-or-targeted send, peer join/leave, getPeers (others).
 */

export type PeerId = string;
export type MessageHandler = (data: string, from: PeerId) => void;
export type PeerHandler = (peerId: PeerId) => void;

export interface Transport {
  readonly selfId: PeerId;
  /** Send to one peer (`to`) or broadcast to all others when `to` is omitted. */
  send(data: string, to?: PeerId): void;
  onMessage(cb: MessageHandler): void;
  onPeerJoin(cb: PeerHandler): void;
  onPeerLeave(cb: PeerHandler): void;
  /** Other connected peers (excludes self), Trystero-style. */
  getPeers(): PeerId[];
  close(): void;
}

class LocalTransport implements Transport {
  private msgCbs: MessageHandler[] = [];
  private joinCbs: PeerHandler[] = [];
  private leaveCbs: PeerHandler[] = [];
  private closed = false;

  constructor(
    readonly selfId: PeerId,
    private readonly hub: LocalHub,
  ) {}

  send(data: string, to?: PeerId): void {
    if (!this.closed) this.hub.route(this.selfId, data, to);
  }
  onMessage(cb: MessageHandler): void {
    this.msgCbs.push(cb);
  }
  onPeerJoin(cb: PeerHandler): void {
    this.joinCbs.push(cb);
  }
  onPeerLeave(cb: PeerHandler): void {
    this.leaveCbs.push(cb);
  }
  getPeers(): PeerId[] {
    return this.hub.peersExcept(this.selfId);
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.hub.leave(this.selfId);
  }

  // hub-internal delivery
  deliver(data: string, from: PeerId): void {
    if (!this.closed) for (const cb of this.msgCbs) cb(data, from);
  }
  notifyJoin(id: PeerId): void {
    for (const cb of this.joinCbs) cb(id);
  }
  notifyLeave(id: PeerId): void {
    for (const cb of this.leaveCbs) cb(id);
  }
}

/** In-memory mesh connecting several LocalTransport endpoints (tests / single-process play). */
export class LocalHub {
  private eps = new Map<PeerId, LocalTransport>();

  join(id: PeerId): Transport {
    const ep = new LocalTransport(id, this);
    for (const [oid, oep] of this.eps) {
      oep.notifyJoin(id);
      ep.notifyJoin(oid);
    }
    this.eps.set(id, ep);
    return ep;
  }

  route(from: PeerId, data: string, to?: PeerId): void {
    if (to !== undefined) {
      this.eps.get(to)?.deliver(data, from);
      return;
    }
    for (const [id, ep] of this.eps) if (id !== from) ep.deliver(data, from);
  }

  peersExcept(id: PeerId): PeerId[] {
    return [...this.eps.keys()].filter((k) => k !== id);
  }

  leave(id: PeerId): void {
    if (!this.eps.delete(id)) return;
    for (const ep of this.eps.values()) ep.notifyLeave(id);
  }
}

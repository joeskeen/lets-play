import { Injectable, signal } from '@angular/core';
import { newId } from './identity';
import type { Identity } from './identity';
import { PeerLink } from './peer-link';
import { parseWire, serialize } from './protocol';
import type { SignalPayload, Wire } from './protocol';

export interface PeerView {
  id: string;
  name: string;
  status: 'connecting' | 'open';
}

export interface MeshHandlers {
  open: (peerId: string) => void;
  close: (peerId: string) => void;
  message: (peerId: string, message: Wire) => void;
}

type SignalMessage = Extract<Wire, { t: 'signal' }>;
type Status = 'connecting' | 'open';

/**
 * A full mesh of data channels with a store-and-forward signaling plane.
 *
 * The bootstrap connection comes from the out-of-band invite/reply exchange.
 * Every later connection is negotiated *through* the peers we are already
 * talking to: SDP and ICE are just messages, relayed hop by hop. That is the
 * serverless stand-in for a signaling server — and for TURN, once the mesh is
 * big enough to offer a second path.
 *
 * No identity or game logic lives here. `Room` owns that.
 */
@Injectable({ providedIn: 'root' })
export class Mesh {
  readonly peers = signal<PeerView[]>([]);

  handlers: MeshHandlers | null = null;

  private selfId = '';
  private readonly links = new Map<string, PeerLink>();
  private readonly statuses = new Map<string, Status>();
  private readonly identities = new Map<string, Identity>();
  private readonly seen = new Set<string>();

  configure(selfId: string): void {
    this.selfId = selfId;
  }

  identify(peerId: string, identity: Identity): void {
    this.identities.set(peerId, identity);
    this.publish();
  }

  /**
   * Add a link that was established out of band (the invite/reply handshake).
   * It may already be open; the mesh fires `open` either way.
   */
  adopt(peerId: string, identity: Identity, link: PeerLink): void {
    this.identities.set(peerId, identity);
    this.links.set(peerId, link);
    this.statuses.set(peerId, 'connecting');
    this.wire(peerId, link);
    this.publish();
    if (link.isOpen) this.markOpen(peerId);
  }

  /** Dial a peer we learned about from the roster. Negotiation is relayed. */
  async dial(peerId: string, identity: Identity): Promise<void> {
    if (!peerId || peerId === this.selfId) return;
    if (this.links.has(peerId)) return;

    const link = new PeerLink(false);
    this.identities.set(peerId, identity);
    this.links.set(peerId, link);
    this.statuses.set(peerId, 'connecting');
    this.wire(peerId, link);
    this.publish();

    try {
      await link.start({ gather: false });
    } catch (error) {
      console.warn('[mesh] could not dial a peer', error);
      this.drop(peerId);
    }
  }

  has(peerId: string): boolean {
    return this.statuses.get(peerId) === 'open';
  }

  sendTo(peerId: string, message: Wire): boolean {
    if (this.statuses.get(peerId) !== 'open') return false;
    const link = this.links.get(peerId);
    return link ? link.send(serialize(message)) : false;
  }

  broadcast(message: Wire, exceptPeerId?: string): void {
    const raw = serialize(message);
    for (const [peerId, link] of this.links) {
      if (peerId === exceptPeerId) continue;
      if (this.statuses.get(peerId) === 'open') link.send(raw);
    }
  }

  /** Drop links to anyone who is no longer on the roster. */
  retain(peerIds: Set<string>): void {
    for (const peerId of [...this.links.keys()]) {
      if (!peerIds.has(peerId)) this.drop(peerId);
    }
  }

  dispose(): void {
    for (const link of [...this.links.values()]) {
      link.close();
    }
    this.links.clear();
    this.statuses.clear();
    this.identities.clear();
    this.seen.clear();
    this.publish();
  }

  private wire(peerId: string, link: PeerLink): void {
    link.setHandlers({
      signal: (payload) => this.sendSignal(peerId, payload),
      message: (data) => this.receive(peerId, data),
      open: () => this.markOpen(peerId),
      close: () => this.drop(peerId),
    });
  }

  private sendSignal(to: string, payload: SignalPayload): void {
    const message: SignalMessage = {
      t: 'signal',
      id: newId(),
      from: this.selfId,
      to,
      payload,
    };
    this.seen.add(message.id);
    this.route(message.to, message, '');
  }

  /**
   * Deliver a signal to its target, or relay it onward. Direct links are
   * preferred; otherwise the message floods through the mesh (with an id
   * cache, so loops are harmless).
   */
  private route(to: string, message: SignalMessage, exceptPeerId: string): void {
    if (to === this.selfId) {
      void this.applySignal(message);
      return;
    }

    if (this.statuses.get(to) === 'open') {
      this.links.get(to)?.send(serialize(message));
      return;
    }

    const raw = serialize(message);
    for (const [peerId, link] of this.links) {
      if (peerId === exceptPeerId) continue;
      if (this.statuses.get(peerId) === 'open') link.send(raw);
    }
  }

  private receive(fromPeerId: string, raw: string): void {
    const message = parseWire(raw);
    if (!message) return;

    if (message.t === 'signal') {
      this.receiveSignal(message, fromPeerId);
      return;
    }

    this.handlers?.message(fromPeerId, message);
  }

  private receiveSignal(message: SignalMessage, fromPeerId: string): void {
    if (this.seen.has(message.id)) return;
    this.seen.add(message.id);
    if (this.seen.size > 8192) this.seen.clear();

    if (message.to === this.selfId) {
      void this.applySignal(message);
      return;
    }

    this.route(message.to, message, fromPeerId);
  }

  private async applySignal(message: SignalMessage): Promise<void> {
    const from = message.from;
    if (!from || from === this.selfId) return;

    let link = this.links.get(from);
    if (!link) {
      // Someone is dialing us. We are the polite peer.
      link = new PeerLink(true);
      this.links.set(from, link);
      this.statuses.set(from, 'connecting');
      this.wire(from, link);
      this.publish();
    }

    await link.handleSignal(message.payload);
  }

  private markOpen(peerId: string): void {
    if (this.statuses.get(peerId) === 'open') return;
    if (!this.links.has(peerId)) return;
    this.statuses.set(peerId, 'open');
    this.publish();
    this.handlers?.open(peerId);
  }

  private drop(peerId: string): void {
    const link = this.links.get(peerId);
    if (!link) return;

    this.links.delete(peerId);
    this.statuses.delete(peerId);
    this.publish();
    link.close();
    this.handlers?.close(peerId);
  }

  private publish(): void {
    const views: PeerView[] = [];
    for (const peerId of this.links.keys()) {
      const identity = this.identities.get(peerId);
      views.push({
        id: peerId,
        name: identity?.name ?? 'Player',
        status: this.statuses.get(peerId) === 'open' ? 'open' : 'connecting',
      });
    }
    views.sort((a, b) => a.name.localeCompare(b.name));
    this.peers.set(views);
  }
}

import type { SignalPayload } from './protocol';

/**
 * One RTCPeerConnection, with perfect negotiation and a single ordered data
 * channel.
 *
 * The link is deliberately dumb about *who* is on the other end: it emits
 * signals through `handlers.signal` and bytes through `handlers.message`.
 * Routing, identity and rooms live in `Mesh` and `Room`.
 */

export interface PeerLinkHandlers {
  signal: (payload: SignalPayload) => void;
  message: (data: string) => void;
  open: () => void;
  close: () => void;
}

export const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
  },
];

const NO_HANDLERS: PeerLinkHandlers = {
  signal: () => undefined,
  message: () => undefined,
  open: () => undefined,
  close: () => undefined,
};

const ICE_GATHER_TIMEOUT = 4000;
const DESCRIPTION_TIMEOUT = 8000;
const DISCONNECT_GRACE = 5000;
const MAX_BUFFERED = 1_000_000;

function candidateInit(candidate: RTCIceCandidate): RTCIceCandidateInit {
  if (typeof candidate.toJSON === 'function') return candidate.toJSON();
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  };
}

export class PeerLink {
  readonly pc: RTCPeerConnection;

  private handlers: PeerLinkHandlers = NO_HANDLERS;
  private channel: RTCDataChannel | null = null;
  private readonly polite: boolean;

  private makingOffer = false;
  private ignoreOffer = false;
  private settingRemoteAnswer = false;
  private closed = false;
  private opened = false;

  private resolveDescription: (() => void) | null = null;
  private readonly descriptionReady: Promise<void>;
  private resolveOpen: (() => void) | null = null;
  private readonly openReady: Promise<void>;

  private pendingCandidates: RTCIceCandidateInit[] = [];
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(polite: boolean, iceServers: RTCIceServer[] = ICE_SERVERS) {
    this.polite = polite;
    this.pc = new RTCPeerConnection({ iceServers });

    this.descriptionReady = new Promise<void>((resolve) => {
      this.resolveDescription = resolve;
    });
    this.openReady = new Promise<void>((resolve) => {
      this.resolveOpen = resolve;
    });

    this.pc.onnegotiationneeded = () => {
      void this.negotiate();
    };

    this.pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.handlers.signal({
        k: 'ice',
        candidate: candidateInit(event.candidate),
      });
    };

    this.pc.ondatachannel = (event) => {
      this.bind(event.channel);
    };

    this.pc.onconnectionstatechange = () => {
      this.onStateChange();
    };
  }

  get isOpen(): boolean {
    return this.opened && !this.closed && this.channel?.readyState === 'open';
  }

  get isClosed(): boolean {
    return this.closed;
  }

  setHandlers(handlers: Partial<PeerLinkHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /** Resolves when the data channel first opens. */
  whenOpen(): Promise<void> {
    return this.openReady;
  }

  /**
   * Create the channel and start negotiating.
   *
   * `gather: true` waits for ICE gathering to finish so the resulting SDP is
   * self-contained — that is what makes a two-message, out-of-band handshake
   * possible. Relayed connections use trickle ICE instead.
   */
  async start(options: { gather?: boolean } = {}): Promise<void> {
    this.createChannel();
    await this.waitForDescription();
    if (options.gather !== false) await this.waitForIce();
  }

  createChannel(): RTCDataChannel {
    if (this.channel) return this.channel;
    const channel = this.pc.createDataChannel('lets-play', { ordered: true });
    this.bind(channel);
    return channel;
  }

  /** Apply an offer and produce an answer locally (the bootstrap joiner). */
  async acceptOffer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    await this.flushCandidates();
    await this.pc.setLocalDescription();
    this.resolveDescription?.();
    this.resolveDescription = null;
  }

  /** Apply an answer (the bootstrap host). */
  async acceptAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
    await this.flushCandidates();
  }

  /** The current local SDP, with any gathered candidates baked in. */
  localSdp(): string {
    return this.pc.localDescription?.sdp ?? '';
  }

  async handleSignal(payload: SignalPayload): Promise<void> {
    if (this.closed) return;

    if (payload.k === 'ice') {
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(payload.candidate);
        return;
      }
      await this.addCandidate(payload.candidate);
      return;
    }

    const description: RTCSessionDescriptionInit = {
      type: payload.type,
      sdp: payload.sdp,
    };

    const readyForOffer =
      !this.makingOffer &&
      (this.pc.signalingState === 'stable' || this.settingRemoteAnswer);

    const offerCollision =
      description.type === 'offer' && !readyForOffer;

    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    try {
      this.settingRemoteAnswer = description.type === 'answer';
      await this.pc.setRemoteDescription(description);
      this.settingRemoteAnswer = false;
      await this.flushCandidates();

      if (description.type === 'offer') {
        await this.pc.setLocalDescription();
        this.resolveDescription?.();
        this.resolveDescription = null;

        const answer = this.pc.localDescription;
        if (answer) {
          this.handlers.signal({
            k: 'sdp',
            type: answer.type,
            sdp: answer.sdp,
          });
        }
      }
    } catch (error) {
      this.settingRemoteAnswer = false;
      if (!this.ignoreOffer) {
        console.warn('[peer] could not apply a signal', error);
      }
    }
  }

  send(text: string): boolean {
    const channel = this.channel;
    if (!channel || channel.readyState !== 'open') return false;
    if (channel.bufferedAmount > MAX_BUFFERED) return false;
    try {
      channel.send(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve once ICE gathering completes or the timeout elapses. Either way,
   * whatever candidates were gathered are already inside `localDescription`.
   */
  async waitForIce(timeout = ICE_GATHER_TIMEOUT): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return;

    await new Promise<void>((resolve) => {
      let done = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const finish = (): void => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        this.pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      };

      const check = (): void => {
        if (this.pc.iceGatheringState === 'complete') finish();
      };

      timer = setTimeout(finish, timeout);
      this.pc.addEventListener('icegatheringstatechange', check);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    try {
      this.channel?.close();
    } catch {
      // already closed
    }
    try {
      this.pc.close();
    } catch {
      // already closed
    }

    this.handlers.close();
  }

  private bind(channel: RTCDataChannel): void {
    if (this.channel && this.channel !== channel) return;
    this.channel = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => this.fireOpen();
    channel.onclose = () => this.fireClose();
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') this.handlers.message(event.data);
    };

    if (channel.readyState === 'open') this.fireOpen();
  }

  private async negotiate(): Promise<void> {
    if (this.closed) return;
    try {
      this.makingOffer = true;
      await this.pc.setLocalDescription();
      this.resolveDescription?.();
      this.resolveDescription = null;

      const offer = this.pc.localDescription;
      if (offer) {
        this.handlers.signal({
          k: 'sdp',
          type: offer.type,
          sdp: offer.sdp,
        });
      }
    } catch (error) {
      console.warn('[peer] could not create an offer', error);
    } finally {
      this.makingOffer = false;
    }
  }

  private async addCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      if (!this.ignoreOffer) {
        console.warn('[peer] could not add an ICE candidate', error);
      }
    }
  }

  private async flushCandidates(): Promise<void> {
    if (this.pendingCandidates.length === 0) return;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      await this.addCandidate(candidate);
    }
  }

  private waitForDescription(timeout = DESCRIPTION_TIMEOUT): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        resolve();
      };
      void this.descriptionReady.then(finish);
      setTimeout(finish, timeout);
    });
  }

  private onStateChange(): void {
    const state = this.pc.connectionState;

    if (state === 'connected') {
      if (this.disconnectTimer) {
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = null;
      }
      this.fireOpen();
      return;
    }

    if (state === 'failed' || state === 'closed') {
      this.fireClose();
      return;
    }

    if (state === 'disconnected' && !this.disconnectTimer) {
      this.disconnectTimer = setTimeout(() => {
        this.disconnectTimer = null;
        if (this.pc.connectionState === 'disconnected') this.fireClose();
      }, DISCONNECT_GRACE);
    }
  }

  private fireOpen(): void {
    if (this.opened || this.closed) return;
    if (this.channel?.readyState !== 'open') return;
    this.opened = true;
    this.resolveOpen?.();
    this.resolveOpen = null;
    this.handlers.open();
  }

  private fireClose(): void {
    if (this.closed) return;
    this.close();
  }
}

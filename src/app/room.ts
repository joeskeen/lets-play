import { computed, inject, Injectable, signal } from '@angular/core';
import { avatarFor, loadIdentity, newId, randomName, sanitizeName, saveIdentity } from './core/identity';
import type { Identity } from './core/identity';
import {
  clearInviteFromUrl,
  decodeInvite,
  encodeInvite,
  extractInviteCode,
  INVITE_VERSION,
  readInviteCode,
} from './core/invite';
import { Mesh } from './core/mesh';
import { PeerLink } from './core/peer-link';
import { PROTOCOL_VERSION } from './core/protocol';
import type { Wire } from './core/protocol';
import {
  blankState,
  reduce,
  shuffle,
  waitingOn,
} from './game/model';
import type { Action, GameState, Member, SharedState } from './game/model';

export type Phase = 'idle' | 'hosting' | 'joining' | 'connected';

export interface MemberView {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMe: boolean;
  connected: boolean;
}

const EMPTY_ROOM = { id: '', name: '', hostId: '', members: [] as Member[] };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The room: identity, replicated state, host authority, and the invite
 * handshake. This is the only place that knows what a "host" or a "player"
 * means.
 */
@Injectable({ providedIn: 'root' })
export class Room {
  private readonly mesh = inject(Mesh);

  readonly identity = signal<Identity>(
    loadIdentity() ?? { id: newId(), name: randomName() },
  );
  readonly state = signal<SharedState>(blankState(EMPTY_ROOM));
  readonly phase = signal<Phase>('idle');
  readonly error = signal('');
  readonly inviteCode = signal('');
  readonly replyCode = signal('');
  readonly joiningHost = signal('');
  readonly busy = signal(false);

  readonly game = computed<GameState>(() => this.state().game);
  readonly isHost = computed(
    () => this.state().room.hostId === this.identity().id,
  );
  readonly me = computed(() => {
    const me = this.identity().id;
    return this.state().room.members.find((member) => member.id === me) ?? null;
  });
  readonly openPeers = computed(
    () => this.mesh.peers().filter((peer) => peer.status === 'open').length,
  );
  readonly isMyTurn = computed(
    () => this.game().step === 'guessing' && this.game().turnId === this.identity().id,
  );
  readonly waiting = computed(() => waitingOn(this.game()));
  readonly scoreboard = computed(() =>
    this.game()
      .players.slice()
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  );
  readonly memberViews = computed<MemberView[]>(() => {
    const me = this.identity().id;
    const hostId = this.state().room.hostId;
    const open = new Set(
      this.mesh
        .peers()
        .filter((peer) => peer.status === 'open')
        .map((peer) => peer.id),
    );
    return this.state().room.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: avatarFor(member.id),
      isHost: member.id === hostId,
      isMe: member.id === me,
      connected: member.id === me || open.has(member.id),
    }));
  });

  private epoch = '';
  private seq = 0;
  private inviteLink: PeerLink | null = null;
  private joinLink: PeerLink | null = null;
  private successionTimer: ReturnType<typeof setTimeout> | null = null;
  private tearingDown = false;

  constructor() {
    saveIdentity(this.identity());
    this.mesh.handlers = {
      open: (peerId) => this.onPeerOpen(peerId),
      close: (peerId) => this.onPeerClose(peerId),
      message: (peerId, message) => this.onMessage(peerId, message),
    };
  }

  // ---------------------------------------------------------------- profile

  setName(value: string): void {
    const name = sanitizeName(value);
    if (!name) return;
    const next = { ...this.identity(), name };
    this.identity.set(next);
    saveIdentity(next);
  }

  // -------------------------------------------------------------- lifecycle

  host(): void {
    this.teardown();
    const me = this.identity();
    const roomId = newId();
    this.epoch = newId();
    this.seq = 0;
    this.mesh.configure(me.id);
    this.state.set(
      blankState({
        id: roomId,
        name: `${me.name}'s game`,
        hostId: me.id,
        members: [{ id: me.id, name: me.name, joinedAt: Date.now() }],
      }),
    );
    this.phase.set('hosting');
    this.error.set('');
  }

  async join(code: string): Promise<void> {
    const raw = extractInviteCode(code);
    if (!raw) throw new Error('Paste the invite link or code first.');

    this.teardown();
    this.phase.set('joining');
    this.error.set('');
    this.busy.set(true);

    try {
      const invite = await decodeInvite(raw);
      if (invite.k !== 'invite') {
        throw new Error('That is a reply code. Send it to the host instead.');
      }
      if (invite.from.id === this.identity().id) {
        throw new Error('That invite was created by this browser.');
      }

      this.joiningHost.set(invite.from.name || 'the host');
      this.mesh.configure(this.identity().id);

      const link = new PeerLink(true);
      await link.acceptOffer(invite.sdp);
      await link.waitForIce();

      const sdp = link.localSdp();
      if (!sdp) throw new Error('Could not prepare the reply.');

      const reply = await encodeInvite({
        v: INVITE_VERSION,
        k: 'reply',
        room: invite.room,
        from: this.identity(),
        sdp,
        at: Date.now(),
      });

      this.joinLink = link;
      this.replyCode.set(reply);
      this.state.set(
        blankState({
          id: invite.room,
          name: `${invite.from.name}'s game`,
          hostId: invite.from.id,
          members: [],
        }),
      );

      void link
        .whenOpen()
        .then(() => {
          if (this.joinLink !== link) return;
          this.mesh.adopt(invite.from.id, invite.from, link);
          this.phase.set('connected');
          this.mesh.sendTo(invite.from.id, {
            t: 'join',
            identity: this.identity(),
          });
        })
        .catch((error: unknown) => {
          if (this.joinLink !== link) return;
          this.error.set(messageOf(error));
        });
    } catch (error) {
      this.phase.set('idle');
      this.error.set(messageOf(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  /** Auto-join when the page is opened from an invite link. */
  async joinFromUrl(): Promise<boolean> {
    const code = readInviteCode(location.hash);
    if (!code) return false;
    clearInviteFromUrl();
    try {
      await this.join(code);
      return true;
    } catch {
      return false;
    }
  }

  leave(): void {
    this.teardown();
    this.phase.set('idle');
    this.state.set(blankState(EMPTY_ROOM));
    this.error.set('');
  }

  // --------------------------------------------------------------- invites

  async createInvite(): Promise<string> {
    if (!this.isHost()) throw new Error('Only the host can invite players.');

    this.busy.set(true);
    this.error.set('');
    try {
      this.inviteLink?.close();
      this.inviteLink = null;
      this.inviteCode.set('');

      const link = new PeerLink(false);
      await link.start({ gather: true });

      const sdp = link.localSdp();
      if (!sdp) throw new Error('Could not prepare the invite.');

      const code = await encodeInvite({
        v: INVITE_VERSION,
        k: 'invite',
        room: this.state().room.id,
        from: this.identity(),
        sdp,
        at: Date.now(),
      });

      this.inviteLink = link;
      this.inviteCode.set(code);
      return code;
    } catch (error) {
      this.error.set(messageOf(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * The host pastes the joiner's reply. That happens out of band, exactly like
   * the invite. Once the channel opens, the joiner is admitted and handed the
   * current snapshot.
   */
  async acceptReply(code: string): Promise<void> {
    if (!this.isHost()) throw new Error('Only the host can accept replies.');
    const link = this.inviteLink;
    if (!link) throw new Error('Create an invite first.');

    const raw = extractInviteCode(code);
    if (!raw) throw new Error('Paste the reply code first.');

    this.busy.set(true);
    this.error.set('');
    try {
      const reply = await decodeInvite(raw);
      if (reply.k !== 'reply') {
        throw new Error('That is an invite link, not a reply.');
      }
      if (reply.room !== this.state().room.id) {
        throw new Error('That reply belongs to a different room.');
      }
      if (reply.from.id === this.identity().id) {
        throw new Error('That reply came from this browser.');
      }
      if (
        this.state().room.members.some(
          (member) => member.id === reply.from.id,
        )
      ) {
        throw new Error('That player is already in this room.');
      }

      await link.acceptAnswer(reply.sdp);
      await withTimeout(
        link.whenOpen(),
        20_000,
        'The connection did not open. Ask them to send a fresh reply.',
      );

      if (this.inviteLink !== link) return;
      this.inviteLink = null;
      this.inviteCode.set('');

      const me = this.identity().id;
      this.hostApply(
        {
          type: 'room/join',
          member: {
            id: reply.from.id,
            name: reply.from.name || 'Player',
            joinedAt: Date.now(),
          },
        },
        me,
      );

      this.mesh.adopt(reply.from.id, reply.from, link);
      this.sendSnapshot(reply.from.id, 'join');
    } catch (error) {
      this.error.set(messageOf(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  // ----------------------------------------------------------------- actions

  renameRoom(name: string): void {
    this.dispatch({ type: 'room/rename', name });
  }

  startGame(prompts: readonly string[]): void {
    this.dispatch({ type: 'game/start', prompts: shuffle(prompts) });
  }

  respond(text: string): void {
    this.dispatch({ type: 'game/respond', responseId: newId(), text });
  }

  guess(responseId: string, guessedId: string): void {
    this.dispatch({ type: 'game/guess', responseId, guessedId });
  }

  nextRound(): void {
    this.dispatch({ type: 'game/next-round' });
  }

  playAgain(): void {
    this.dispatch({ type: 'game/new' });
  }

  dispatch(action: Action): void {
    const me = this.identity().id;
    if (this.isHost()) {
      this.hostApply(action, me);
      return;
    }
    const hostId = this.state().room.hostId;
    if (hostId) this.mesh.sendTo(hostId, { t: 'intent', action });
  }

  // ------------------------------------------------------------ host writes

  private hostApply(action: Action, actorId: string): void {
    if (!this.isHost()) return;
    const current = this.state();
    const next = reduce(current, action, actorId);
    if (!next || next === current) return;

    this.state.set(next);
    this.seq += 1;
    this.mesh.broadcast({
      t: 'event',
      epoch: this.epoch,
      seq: this.seq,
      actor: actorId,
      action,
    });
  }

  private sendSnapshot(peerId: string, why: string): void {
    this.mesh.sendTo(peerId, {
      t: 'snapshot',
      epoch: this.epoch,
      seq: this.seq,
      state: this.state(),
      why,
    });
  }

  // ---------------------------------------------------------- mesh callbacks

  private onPeerOpen(peerId: string): void {
    if (this.tearingDown) return;
    this.mesh.sendTo(peerId, {
      t: 'hello',
      v: PROTOCOL_VERSION,
      room: this.state().room.id,
      identity: this.identity(),
    });
  }

  private onPeerClose(peerId: string): void {
    if (this.tearingDown) return;

    if (this.isHost()) {
      const isMember = this.state().room.members.some(
        (member) => member.id === peerId,
      );
      if (isMember) {
        this.hostApply(
          { type: 'room/leave', memberId: peerId },
          this.identity().id,
        );
      }
      return;
    }

    if (peerId === this.state().room.hostId) {
      this.onHostLost(peerId);
      return;
    }

    // A guest-to-guest link can drop without either side leaving. If the peer
    // is still on the roster, try once more through the mesh.
    if (
      this.state().room.members.some((member) => member.id === peerId)
    ) {
      this.retryDial(peerId);
    }
  }

  private retryDial(peerId: string): void {
    setTimeout(() => {
      if (this.tearingDown) return;
      if (this.mesh.has(peerId)) return;
      if (this.identity().id === peerId) return;

      const room = this.state().room;
      if (room.hostId === peerId) return;

      const member = room.members.find((entry) => entry.id === peerId);
      if (!member) return;

      void this.mesh.dial(peerId, { id: member.id, name: member.name });
    }, 2000);
  }

  private onMessage(peerId: string, message: Wire): void {
    if (this.tearingDown) return;

    switch (message.t) {
      case 'hello': {
        if (message.v !== PROTOCOL_VERSION) {
          this.error.set(
            'Someone is running a different version of Let’s Play.',
          );
          return;
        }
        if (message.room && message.room !== this.state().room.id) return;
        this.mesh.identify(peerId, message.identity);
        return;
      }

      case 'join': {
        if (!this.isHost()) return;
        this.mesh.identify(peerId, message.identity);
        this.admit(message.identity);
        return;
      }

      case 'intent': {
        if (!this.isHost()) return;
        this.hostApply(message.action, peerId);
        return;
      }

      case 'event': {
        if (this.isHost()) return;
        // Only the host may write. Without this check any guest could forge an
        // event and every other guest would replay it.
        if (peerId !== this.state().room.hostId) return;
        this.applyEvent(message);
        return;
      }

      case 'snapshot': {
        this.applySnapshot(message, peerId);
        return;
      }

      case 'resync': {
        if (this.isHost()) this.sendSnapshot(peerId, 'resync');
        return;
      }

      case 'error': {
        this.error.set(message.message);
        return;
      }

      default:
        return;
    }
  }

  private admit(identity: Identity): void {
    const exists = this.state().room.members.some(
      (member) => member.id === identity.id,
    );
    if (!exists) {
      this.hostApply(
        {
          type: 'room/join',
          member: {
            id: identity.id,
            name: identity.name || 'Player',
            joinedAt: Date.now(),
          },
        },
        this.identity().id,
      );
    }
    this.sendSnapshot(identity.id, 'join');
  }

  // -------------------------------------------------------------- guest reads

  private applyEvent(message: Extract<Wire, { t: 'event' }>): void {
    if (message.epoch !== this.epoch) {
      this.requestResync();
      return;
    }
    if (message.seq <= this.seq) return;
    if (message.seq !== this.seq + 1) {
      this.requestResync();
      return;
    }

    const next = reduce(this.state(), message.action, message.actor);
    if (!next) return;

    this.state.set(next);
    this.seq = message.seq;
  }

  private applySnapshot(
    message: Extract<Wire, { t: 'snapshot' }>,
    fromPeerId: string,
  ): void {
    const next = message.state;
    const hostId = next.room?.hostId;
    if (typeof hostId !== 'string' || !hostId) return;
    // A snapshot must name the peer that sent it as the host.
    if (hostId !== fromPeerId) return;
    const host = next.room.members.find((member) => member.id === hostId);
    if (!host) return;

    if (message.why === 'promote') {
      // Only a peer that is next in line may claim the empty host seat.
      if (!this.mayLead(next, fromPeerId)) return;
    } else if (fromPeerId !== this.state().room.hostId) {
      // Ordinary snapshots only come from the host we already follow.
      return;
    }

    if (message.epoch === this.epoch && message.seq < this.seq) return;

    this.epoch = message.epoch;
    this.seq = message.seq;
    this.state.set(next);
    this.phase.set('connected');
    this.error.set('');
    this.clearSuccessionTimer();
    this.reconcile();
  }

  /**
   * Succession rule, checked locally: walk the roster in join order and stop at
   * whichever comes first — the sender, us, or another peer we can reach. A
   * sender is allowed to lead only if nobody ahead of it is still reachable
   * (the same rule that decides who promotes after a host leaves).
   */
  private mayLead(next: SharedState, fromPeerId: string): boolean {
    const oldHostId = this.state().room.hostId;
    const ordered = next.room.members
      .filter((member) => member.id !== oldHostId)
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

    for (const member of ordered) {
      if (member.id === fromPeerId) return true;
      if (member.id === this.identity().id) {
        return this.state().room.hostId === fromPeerId;
      }
      if (this.mesh.has(member.id)) return false;
    }
    return false;
  }

  private requestResync(): void {
    const hostId = this.state().room.hostId;
    if (hostId) this.mesh.sendTo(hostId, { t: 'resync' });
  }

  // ------------------------------------------------------------- mesh repair

  private reconcile(): void {
    const me = this.identity().id;
    const room = this.state().room;
    const ids = new Set(room.members.map((member) => member.id));

    for (const member of room.members) {
      if (member.id === me) continue;
      const identity = { id: member.id, name: member.name };
      this.mesh.identify(member.id, identity);
      if (!this.mesh.has(member.id)) {
        void this.mesh.dial(member.id, identity);
      }
    }

    this.mesh.retain(ids);
  }

  // ---------------------------------------------------------- host succession

  private onHostLost(oldHostId: string): void {
    const room = this.state().room;
    const candidates = room.members
      .filter((member) => member.id !== oldHostId)
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

    const successor = candidates[0];
    if (!successor) return;

    if (successor.id === this.identity().id) {
      this.promote(oldHostId);
      return;
    }

    // Wait for the designated successor to announce itself. If it does not
    // (it may be gone too), fall back to the earliest member still reachable.
    this.clearSuccessionTimer();
    this.successionTimer = setTimeout(() => {
      this.successionTimer = null;
      if (this.state().room.hostId !== oldHostId) return;

      const reachable = candidates.filter(
        (member) =>
          member.id === this.identity().id || this.mesh.has(member.id),
      );
      const next = reachable[0];
      if (next && next.id === this.identity().id) this.promote(oldHostId);
    }, 4000);
  }

  private promote(oldHostId: string): void {
    const me = this.identity().id;
    const before = this.state();
    const withHost: SharedState = {
      ...before,
      room: { ...before.room, hostId: me },
    };

    // Reuse the ordinary leave rules so the turn advances and a stalled
    // writing phase can still move on.
    const cleaned =
      reduce(withHost, { type: 'room/leave', memberId: oldHostId }, me) ??
      withHost;

    this.epoch = newId();
    this.seq = 0;
    this.state.set(cleaned);
    this.phase.set('connected');
    this.mesh.broadcast({
      t: 'snapshot',
      epoch: this.epoch,
      seq: this.seq,
      state: this.state(),
      why: 'promote',
    });
    this.reconcile();
  }

  private clearSuccessionTimer(): void {
    if (!this.successionTimer) return;
    clearTimeout(this.successionTimer);
    this.successionTimer = null;
  }

  // ------------------------------------------------------------------ cleanup

  private teardown(): void {
    this.tearingDown = true;
    this.clearSuccessionTimer();
    this.inviteLink?.close();
    this.inviteLink = null;
    this.joinLink?.close();
    this.joinLink = null;
    this.mesh.dispose();
    this.inviteCode.set('');
    this.replyCode.set('');
    this.joiningHost.set('');
    this.error.set('');
    this.epoch = '';
    this.seq = 0;
    this.tearingDown = false;
  }
}

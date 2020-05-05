import { Injectable } from '@angular/core';
import { ModalService } from '@healthcatalyst/cashmere';
import { InitiateConnectionModal } from './initiate-connection.modal';
import { first, map, filter, tap, switchMap } from 'rxjs/operators';
import { RtcClient } from './rtc-client';
import { IMessage } from './messages';
import { RtcService } from './rtc.service';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { getUser } from '../user/user.reducer';
import { IUser } from '../user/user';
import { CompleteConnectionModal } from './complete-connection.modal';
import { connectionMessageReceived } from '../global/app.actions';

@Injectable({ providedIn: 'root' })
export class ConnectionManagerService {
  clients: RtcClient[] = [];
  user: IUser;

  constructor(
    private modalService: ModalService,
    private rtcService: RtcService,
    private store: Store<AppState>
  ) {
    store.select(getUser).subscribe((u) => (this.user = u));
  }

  async createNewConnection() {
    const peerClient: RtcClient = await this.modalService
      .open(InitiateConnectionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
    this.addClient(peerClient);
  }

  async joinNewConnection() {
    const peerClient: RtcClient = await this.modalService
      .open(CompleteConnectionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
    this.addClient(peerClient);
  }

  async createConnectionVia(peerId: string, middleManId: string) {
    if (this.isConnectedToPeer(peerId)) {
      return;
    }
    if (!this.isConnectedToPeer(middleManId)) {
      throw new Error(
        'Cannot connect via middleman: not connected to any peer with the id ' +
          middleManId
      );
    }

    const middleManClient = this.getClient(middleManId);

    const peerClient: RtcClient = await this.rtcService.create(
      this.user,
      (sessionInit) => {
        const promise = middleManClient.receivedMessage$
          .pipe(
            filter((m) => m.type === 'relay'),
            map((m) => m as IRelayMessage<any>),
            filter((d) => d.fromId === peerId && d.toId === this.user.uniqueId),
            filter((m) => m.data.type === 'connection-invite-accepted'),
            map((m) => m as IRelayMessage<RTCSessionDescriptionInit>),
            map((m) => m.data.data),
            first()
          )
          .toPromise();
        this.send(
          {
            type: 'relay',
            fromId: this.user.uniqueId,
            viaId: middleManId,
            toId: peerId,
            data: { type: 'connection-invite', data: sessionInit },
          } as IRelayMessage<RTCSessionDescriptionInit>,
          middleManId
        );
        return promise;
      }
    );
    this.addClient(peerClient);
  }

  async broadcast(message: IMessage) {
    this.clients.forEach((c) => {
      c.sendMessage(message);
    });
  }

  async send<T = any>(message: IMessage<T>, peerId: string) {
    if (!this.isConnectedToPeer(peerId)) {
      throw new Error(
        'Cannot send message to peer: not connected to any peer with the id ' +
          peerId
      );
    }
    const client = this.getClient(peerId);
    client.sendMessage(message);
  }

  isConnectedToPeer(peerId: string): boolean {
    return !!this.clients.find((c) => c.peer.uniqueId === peerId);
  }

  getClient(peerId: string): RtcClient {
    const client = this.clients.find((c) => c.peer.uniqueId === peerId);
    if (!client) {
      throw new Error('Could not get client matching id ' + peerId);
    }

    return client;
  }

  async removePeer(peerId: string) {
    this.clients = this.clients.filter((c) => c.peer.uniqueId !== peerId);
  }

  async connectClients(clientA: RtcClient, clientB: RtcClient) {
    const a = this.getClient(clientA.peer.uniqueId);
    a.sendMessage({ type: 'connect-to-user', data:{ peerId: clientB.peer.uniqueId, middleManId: this.user.uniqueId }});
  }

  addClient(client: RtcClient) {
    this.clients.push(client);

    // when I receive a message, let Redux know
    client.receivedMessage$.subscribe((m) =>
      this.store.dispatch(
        connectionMessageReceived({
          fromUser: client.peer.uniqueId,
          message: m,
        })
      )
    );

    // if I'm the middleman, forward it along
    client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'relay'),
        map((m) => m as IRelayMessage),
        filter((m) => this.isConnectedToPeer(m.toId))
      )
      .subscribe((m) => this.send(m, m.toId));

    // when I'm invited to connect, I oblige
    client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'relay'),
        map((m) => m as IRelayMessage),
        filter((m) => m.toId === this.user.uniqueId),
        filter((m) => m.data.type === 'connection-invite'),
        map((m) => m as IRelayMessage<RTCSessionDescriptionInit>)
      )
      .subscribe((m) => this.respondToConnectionInvite(m));

    // when I'm told to remove a user, I oblige
    client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'disconnect-from-user'),
        map((m) => m as IMessage<string>)
      )
      .subscribe((m) => this.removePeer(m.data));

    // when I'm told to connect to a user, I oblige
    client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'connect-to-user'),
        map((m) => m as IMessage<{ peerId: string; middleManId: string }>),
        filter((m) => !this.isConnectedToPeer(m.data.peerId))
      )
      .subscribe((m) =>
        this.createConnectionVia(m.data.peerId, m.data.middleManId)
      );
  }

  private async respondToConnectionInvite(
    relayMessage: IRelayMessage<RTCSessionDescriptionInit>
  ) {
    if (this.isConnectedToPeer(relayMessage.fromId)) {
      return;
    }
    if (!this.isConnectedToPeer(relayMessage.viaId)) {
      throw new Error(
        'Cannot respond to connection invite: no connection with the specified middleman exists: ' +
          relayMessage.viaId
      );
    }
    const middleManClient = this.getClient(relayMessage.viaId);
    const client = await this.rtcService.join(
      relayMessage.data.data,
      this.user,
      async (response) =>
        middleManClient.sendMessage({
          type: 'relay',
          fromId: this.user.uniqueId,
          toId: relayMessage.fromId,
          viaId: relayMessage.viaId,
          data: {
            type: 'connection-invite-accepted',
            data: response,
          },
        } as IRelayMessage<RTCSessionDescriptionInit>)
    );
    this.addClient(client);
  }
}

export interface IRelayMessage<T = any> extends IMessage<IMessage<T>> {
  type: 'relay';
  fromId: string;
  viaId: string;
  toId: string;
  data: IMessage<T>;
}

import { RtcClient } from '../webrtc/rtc-client';
import { ChatEntry } from './chat-entry';
import { Observable, merge } from 'rxjs';
import { IUser } from '../user/user';
import { filter, scan, map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HcToasterService } from '@healthcatalyst/cashmere';
import { ChatToast } from '../toasts/chat.toast';

const chatHistoryLimit = 100;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly clients: Record<symbol, RtcClient> = {};
  readonly chatHistory: Record<symbol, Observable<ChatEntry[]>> = {};

  constructor(private toastService: HcToasterService) {}

  addPeer(client: RtcClient) {
    const peer = client.peer;
    this.clients[peer.uniqueId] = client;
    this.chatHistory[peer.uniqueId] = merge(
      client.receivedMessage$,
      client.sentMessage$
    ).pipe(
      filter((m) => m.type === 'chat'),
      map(
        (m) =>
          ({ message: m.data, user: peer, timestamp: Date.now() } as ChatEntry)
      ),
      scan(
        (history, entry) => [...history, entry].slice(-1 * chatHistoryLimit),
        [] as ChatEntry[]
      )
    );
    client.receivedMessage$
      .pipe(filter((m) => m.type === 'chat'))
      .subscribe((m) => {
        this.toastService.addToast({ type: 'custom' }, ChatToast, {
          message: m.data,
          user: client.peer,
        });
      });
  }

  removePeer(uniqueId: symbol) {
    delete this.clients[uniqueId];
    delete this.chatHistory[uniqueId];
  }

  sendMessage(peer: IUser, message: string) {
    const peerClient: RtcClient = this.clients[peer.uniqueId];
    if (!peerClient) {
      throw new Error(
        `Can't send message to ${peer.name}: either they have not been added or have been removed.`
      );
    }

    peerClient.sendMessage({
      type: 'chat',
      data: message,
    });
  }
}

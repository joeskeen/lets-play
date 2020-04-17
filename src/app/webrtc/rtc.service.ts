import { Injectable } from '@angular/core';
import { fromEvent, timer } from 'rxjs';
import { map, filter, switchMap, tap, first } from 'rxjs/operators';
import { from } from 'rxjs';
import { EncodingService } from './encoding.service';
import { RtcClient } from './rtc-client';
import { IUserMessage } from './messages';
import { IUser } from '../models/user';

const win = window as Window & any;
const RtcPeerConnection: typeof RTCPeerConnection =
  win.RTCPeerConnection ||
  win.webkitRTCPeerConnection ||
  win.mozRTCPeerConnection;

@Injectable({ providedIn: 'root' })
export class RtcService {
  async create(
    user: IUser,
    getPeerResponse: (
      localDescriptionMessage: RTCSessionDescriptionInit
    ) => Promise<RTCSessionDescriptionInit>
  ): Promise<RtcClient> {
    const peerConn: RTCPeerConnection = new RtcPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    const dataChannel = peerConn.createDataChannel('rtcService');
    const client = new RtcClient(dataChannel);
    const peerJoined = fromEvent<RTCPeerConnectionIceEvent>(
      peerConn,
      'icecandidate'
    )
      .pipe(
        filter((e) => e.candidate === null),
        switchMap(() => from(getPeerResponse(peerConn.localDescription))),
        first()
      )
      .toPromise();

    try {
      const desc = await peerConn.createOffer({});
      await peerConn.setLocalDescription(desc);
    } catch (err) {
      console.error(err);
    }
    const answer = await peerJoined;
    await peerConn.setRemoteDescription(answer);
    await timer(0, 100)
      .pipe(
        filter(() => dataChannel.readyState === 'open'),
        first()
      )
      .toPromise();
    client.sendMessage({ type: 'user', data: user } as IUserMessage);
    const peerUser = await client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'user'),
        map((m: IUserMessage) => m.data),
        first()
      )
      .toPromise();
    client.peer = peerUser;
    return client;
  }

  async join(
    offer: RTCSessionDescriptionInit,
    user: IUser,
    sendResponseToHost: (sessionDescription: RTCSessionDescription) => void
  ): Promise<RtcClient> {
    const peerConn: RTCPeerConnection = new RtcPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    const clientCreated = fromEvent<RTCPeerConnectionIceEvent>(
      peerConn,
      'icecandidate'
    )
      .pipe(
        filter((e) => e.candidate == null),
        tap(() => sendResponseToHost(peerConn.localDescription)),
        switchMap(() =>
          fromEvent<RTCDataChannelEvent>(peerConn, 'datachannel')
        ),
        map((val) => val.channel),
        map((channel) => new RtcClient(channel)),
        first()
      )
      .toPromise();

    await peerConn.setRemoteDescription(offer);

    try {
      const answerDesc = await peerConn.createAnswer({});
      await peerConn.setLocalDescription(answerDesc);
    } catch (err) {
      console.warn(`Couldn't create answer`);
    }

    const client = await clientCreated;
    const peerUser = await client.receivedMessage$
      .pipe(
        filter((m) => m.type === 'user'),
        map((m: IUserMessage) => m.data),
        first()
      )
      .toPromise();
    client.peer = peerUser;
    client.sendMessage({ type: 'user', data: user } as IUserMessage);
    return client;
  }
}

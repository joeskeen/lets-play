import { Injectable } from '@angular/core';
import { fromEvent, combineLatest } from 'rxjs';
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
  constructor(private encodingService: EncodingService) {}

  async create(
    user: IUser,
    getPeerResponse: (localDescriptionMessage: string) => Promise<string>
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
        switchMap(() =>
          from(
            getPeerResponse(
              `Join me online!\r\n
1. Go to ${window.location.href}
2. Click Join Session
3. Paste the following message in the text area:\r\n\r\n` +
                this.encodingService.encode(peerConn.localDescription)
            )
          )
        ),
        tap((answer) =>
          peerConn.setRemoteDescription(
            new RTCSessionDescription(this.encodingService.decode(answer))
          )
        ),
        first()
      )
      .toPromise();
    try {
      const desc = await peerConn.createOffer({});
      peerConn.setLocalDescription(desc);
    } catch (err) {
      console.error(err);
    }
    await peerJoined;
    if (dataChannel.readyState !== 'open') {
      await fromEvent(dataChannel, 'open').pipe(first()).toPromise();
    }
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
    offer: string,
    user: IUser,
    sendResponseToHost: (sessionDescription: string) => void
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
        tap(() =>
          sendResponseToHost(
            this.encodingService.encode(peerConn.localDescription)
          )
        ),
        switchMap(() =>
          fromEvent<RTCDataChannelEvent>(peerConn, 'datachannel')
        ),
        map((val) => val.channel),
        map((channel) => new RtcClient(channel)),
        first()
      )
      .toPromise();

    const offerDesc = new RTCSessionDescription(
      this.encodingService.decode(offer)
    );
    peerConn.setRemoteDescription(offerDesc);

    try {
      const answerDesc = await peerConn.createAnswer({});
      peerConn.setLocalDescription(answerDesc);
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

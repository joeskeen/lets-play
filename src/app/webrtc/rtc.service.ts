import { Injectable } from '@angular/core';
import { fromEvent, combineLatest } from 'rxjs';
import { map, filter, switchMap, tap, first } from 'rxjs/operators';
import { from } from 'rxjs';
import { EncodingService } from './encoding.service';
import { RtcClient } from './rtc-client';

const win = window as Window & any;
const RtcPeerConnection: typeof RTCPeerConnection =
  win.RTCPeerConnection ||
  win.webkitRTCPeerConnection ||
  win.mozRTCPeerConnection;

@Injectable({ providedIn: 'root' })
export class RtcService {
  constructor(private encodingService: EncodingService) {}

  async create(
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
    return client;
  }

  async join(
    offer: string,
    getHostResponse: (sessionDescription: string) => Promise<void>
  ): Promise<RtcClient> {
    const peerConn: RTCPeerConnection = new RtcPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    const peerJoined = fromEvent<RTCPeerConnectionIceEvent>(
      peerConn,
      'icecandidate'
    )
      .pipe(
        filter((e) => e.candidate == null),
        switchMap(() =>
          combineLatest([
            fromEvent<RTCDataChannelEvent>(peerConn, 'datachannel'),
            from(
              getHostResponse(
                this.encodingService.encode(peerConn.localDescription)
              )
            ),
          ])
        ),
        map((val) => val[0].channel),
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

    const client = await peerJoined;
    return client;
  }
}

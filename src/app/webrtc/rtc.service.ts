import { Injectable } from '@angular/core';
import { Observable, fromEvent, combineLatest } from 'rxjs';
import { map, filter, switchMap, tap, first } from 'rxjs/operators';
import { from } from 'rxjs';
import { EncodingService } from './encoding.service';

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
    peerConn.ondatachannel = (e) => {};
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

export class RtcClient {
  private isOpen = false;
  readonly receivedMessage$: Observable<any>;

  constructor(private channel: RTCDataChannel) {
    this.receivedMessage$ = fromEvent<MessageEvent>(channel, 'message').pipe(
      map((e) => JSON.parse(e.data))
    );
    fromEvent(channel, 'open').subscribe(() => {
      this.isOpen = true;
    });
  }
  sendMessage(message: any) {
    this.channel.send(JSON.stringify(message));
  }
}

@Injectable({ providedIn: 'root' })
export class RtcHostService {
  clients: RtcClient[] = [];

  constructor(private rtcService: RtcService) {}

  async addParticipant() {
    this.clients.push(
      await this.rtcService.create((offer) => Promise.resolve({} as any))
      // TODO actually pass on the offer
    );
  }

  async broadcast(message: any) {
    this.clients.forEach((c) => {
      c.sendMessage(message);
    });
  }

  async removeParticipant(client: RtcClient) {
    this.clients = this.clients.filter((c) => c !== client);
  }
}

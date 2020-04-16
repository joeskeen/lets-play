import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

export class RtcClient {
  readonly receivedMessage$: Observable<any>;

  constructor(private channel: RTCDataChannel) {
    this.receivedMessage$ = fromEvent<MessageEvent>(channel, 'message').pipe(
      map((e) => JSON.parse(e.data))
    );
  }

  sendMessage(message: any) {
    this.channel.send(JSON.stringify(message));
  }
}

import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { IUser } from '../models/user';
import { IMessage } from './messages';

export class RtcClient {
  peer: IUser;
  readonly receivedMessage$: Observable<IMessage>;

  constructor(private channel: RTCDataChannel) {
    this.receivedMessage$ = fromEvent<MessageEvent>(channel, 'message').pipe(
      map((e) => JSON.parse(e.data) as IMessage)
    );
  }

  sendMessage(message: IMessage) {
    this.channel.send(JSON.stringify(message));
  }
}

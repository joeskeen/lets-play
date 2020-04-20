import { Observable, fromEvent, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { IUser } from '../user/user';
import { IMessage } from './messages';

export class RtcClient {
  peer: IUser;
  readonly receivedMessage$: Observable<IMessage>;
  private readonly _sentMessage = new Subject<IMessage>();
  readonly sentMessage$ = this._sentMessage.asObservable();

  constructor(private channel: RTCDataChannel) {
    this.receivedMessage$ = fromEvent<MessageEvent>(channel, 'message').pipe(
      map((e) => JSON.parse(e.data) as IMessage)
    );
  }

  sendMessage(message: IMessage) {
    this.channel.send(JSON.stringify(message));
    this._sentMessage.next(message);
  }
}

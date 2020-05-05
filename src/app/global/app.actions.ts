import { createAction, props } from '@ngrx/store';
import { IMessage } from '../webrtc/messages';

const globalActionType = (type: string) => `global:${type}`;

export const connectionMessageReceived = createAction(
  globalActionType('connection-message-received'),
  props<{ fromUser: string; message: IMessage }>()
);

export const updateUserIsSupremeLeader = createAction(
  globalActionType('user-is-supreme-leader'),
  props<{ isUserSupremeLeader: boolean }>()
);

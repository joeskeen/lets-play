import { Injectable } from '@angular/core';
import { ConnectionManagerService } from '../webrtc/connection-manager.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { withLatestFrom, map, filter, tap } from 'rxjs/operators';
import { AppState } from './app.reducer';
import { Store } from '@ngrx/store';
import {
  connectionMessageReceived,
  updateUserIsSupremeLeader,
  requestBroadcastAction,
} from './app.actions';
import { TypedAction } from '@ngrx/store/src/models';
import { updateUser } from '../user/user.actions';
import {
  updateGroup,
  resetGroupUsers,
  addUser,
  removeUser,
} from '../group/group.actions';

// actions that MUST NOT be broadcast
const actionBroadcastBlacklist: Array<string | RegExp> = [
  /\brequest/gi,
  ...[updateUser, updateUserIsSupremeLeader, connectionMessageReceived].map(
    (a) => a.type
  ),
];

@Injectable()
export class AppEffects {
  constructor(
    private actions: Actions,
    private store: Store<AppState>,
    private connectionManager: ConnectionManagerService
  ) {}

  readonly broadcastStateChanges = createEffect(() =>
    this.actions.pipe(
      withLatestFrom(this.store),
      filter(
        // only broadcast from the host
        ([_, state]) => state.global.isUserSupremeLeader
      ),
      filter(
        // filter out blacklisted actions
        ([action]) =>
          !(action as any).broadcasted &&
          !actionBroadcastBlacklist.find((b) =>
            typeof b === 'string' ? b === action.type : b.test(action.type)
          )
      ),
      tap(([action]) =>
        console.log(`requesting broadcast of action ${action.type}...`)
      ),
      map(([action]) => requestBroadcastAction({ action }))
    )
  );

  readonly requestBroadcastAction = createEffect(
    () =>
      this.actions.pipe(
        ofType(requestBroadcastAction),
        filter(a => !(a as any).broadcasted && !(a.action as any).broadcasted && a.action.type !== requestBroadcastAction.type),
        withLatestFrom(this.store),
        tap(([action]) => console.log(`Broadcasting ${action.action.type}...`)),
        tap(([action, state]) =>
          this.connectionManager.broadcast({
            type: '@ngrx-action',
            data: {
              originatorId: state.user.uniqueId,
              action: { ...action.action, broadcasted: true },
            },
          })
        )
      ),
    { dispatch: false }
  );

  readonly replayAction = createEffect(() =>
    this.actions.pipe(
      ofType(connectionMessageReceived),
      filter((a) => a.message.type === '@ngrx-action'),
      tap(a => console.log(`replaying action ${a.message.data.action.type}...`)),
      map((a) => a.message.data.action as TypedAction<any>)
    )
  );

  readonly userIsSupremeLeader = createEffect(() =>
    this.actions.pipe(
      ofType(updateUser, updateGroup, resetGroupUsers, addUser, removeUser),
      withLatestFrom(this.store),
      map(([_, state]) =>
        updateUserIsSupremeLeader({
          isUserSupremeLeader:
            state.group?.supremeLeader &&
            state.user?.uniqueId === state.group.supremeLeader.uniqueId,
        })
      )
    )
  );
}

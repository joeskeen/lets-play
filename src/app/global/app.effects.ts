import { Injectable } from '@angular/core';
import { ConnectionManagerService } from '../webrtc/connection-manager.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { withLatestFrom, map, filter, tap } from 'rxjs/operators';
import { AppState } from './app.reducer';
import { Store } from '@ngrx/store';
import { connectionMessageReceived } from './app.actions';
import { TypedAction } from '@ngrx/store/src/models';

@Injectable()
export class AppEffects {
  constructor(
    private actions: Actions,
    private store: Store<AppState>,
    private connectionManager: ConnectionManagerService
  ) {}

  readonly broadcastStateChanges = createEffect(
    () =>
      this.actions.pipe(
        withLatestFrom(this.store),
        filter(
          ([_, state]) =>
            state.user &&
            state.user.uniqueId &&
            state.group &&
            state.group.users &&
            state.group.users.length > 1 &&
            state.group.supremeLeader.uniqueId === state.user.uniqueId
        ),
        tap(([action, state]) =>
          this.connectionManager.broadcast({
            type: '@ngrx-action',
            data: { originatorId: state.user.uniqueId, action },
          })
        )
      ),
    { dispatch: false }
  );

  readonly replayAction = createEffect(() =>
    this.actions.pipe(
      ofType(connectionMessageReceived),
      filter((a) => a.message.type === '@ngrx-action'),
      // TODO: this probably will go horribly wrong if further filtering isn't done
      map((a) => a.message.data.action as TypedAction<any>)
    )
  );
}

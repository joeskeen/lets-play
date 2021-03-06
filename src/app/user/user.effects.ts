import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { switchMap, first, map, withLatestFrom, tap, filter } from 'rxjs/operators';
import { StorageMap } from '@ngx-pwa/local-storage';
import { Observable } from 'rxjs';
import { ModalService } from '@healthcatalyst/cashmere';
import { UserSetupModal, IUserSetupData } from './user-setup.modal';
import { IUser } from './user';
import { requestLoadUser, updateUser, requestEditUser } from './user.actions';
import { Store } from '@ngrx/store';
import { UserState, getUser } from './user.reducer';
import { AppState } from '../global/app.reducer';
import { updateGroupUser } from '../group/group.actions';
import { ConnectionManagerService } from '../webrtc/connection-manager.service';

const userStorageKey = 'global:user';

@Injectable()
export class UserEffects {
  constructor(
    private actions$: Actions,
    private storageMap: StorageMap,
    private store: Store<AppState>,
    private modalService: ModalService,
    private connectionManager: ConnectionManagerService
  ) {}

  readonly requestLoadUser = createEffect(() =>
    this.actions$.pipe(
      ofType(requestLoadUser),
      switchMap(() => this.storageMap.get<IUser>(userStorageKey)),
      map((user: IUser) =>
        user ? updateUser({ user }) : requestEditUser({ mandatory: true })
      )
    )
  );

  readonly requestEditUser = createEffect(() =>
    this.actions$.pipe(
      ofType(requestEditUser),
      withLatestFrom(this.store.select(getUser)),
      switchMap(
        ([action, user]) =>
          this.modalService
            .open(UserSetupModal, {
              data: { user, canCancel: !action.mandatory } as IUserSetupData,
            })
            .result.pipe(first()) as Observable<IUser>
      ),
      map((u: IUser) => updateUser({ user: u }))
    )
  );

  readonly storeUpdatedUser = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateUser),
        switchMap((u) => this.storageMap.set(userStorageKey, u.user))
      ),
    { dispatch: false }
  );

  readonly updateGroupUser = createEffect(() =>
    this.actions$.pipe(
      ofType(updateUser),
      withLatestFrom(this.store),
      filter(([_, state]) => !state.global.isUserSupremeLeader),
      tap(([action, state]) => {
        this.connectionManager.broadcast({
          type: '@ngrx-action',
          data: { originatorId: state.user.uniqueId, action: updateGroupUser({ user: action.user }) },
        });
      })
    ), {dispatch: false}
  );

  readonly updateUserInGroup = createEffect(() =>
    this.actions$.pipe(
      ofType(updateUser),
      map((u) => updateGroupUser({ user: { ...u.user, email: undefined } }))
    )
  );
}

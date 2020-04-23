import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { updateUser } from '../user/user.actions';
import {
  updateGroupUser,
  updateGroup,
  requestAddUser,
  requestCreateGroup,
  requestEditGroup,
} from './group.actions';
import { map, filter, withLatestFrom, switchMap, first } from 'rxjs/operators';
import { ModalService } from '@healthcatalyst/cashmere';
import {
  GroupSettingsModal,
  GroupSettingsModalData,
} from './group-settings.modal';
import { getGroup } from './group.reducer';

@Injectable()
export class GroupEffects {
  constructor(
    private state: Store<AppState>,
    private actions: Actions,
    private modalService: ModalService
  ) {}

  readonly updateUser$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(updateUser),
        map((a) => updateGroupUser({ user: a.user }))
      ),
    { dispatch: false }
  );

  readonly addUserOnGroupUpdateIfOnlyOneUser$ = createEffect(() =>
    this.actions.pipe(
      ofType(updateGroup),
      filter((a) => a.group.users.length === 1),
      map(() => requestAddUser())
    )
  );

  readonly requestCreateGroup$ = createEffect(() =>
    this.actions.pipe(
      ofType(requestCreateGroup),
      withLatestFrom(this.state),
      switchMap(([_, state]) =>
        this.modalService
          .open(GroupSettingsModal, {
            data: {
              new: true,
              user: state.user,
              group: this.state.select(getGroup),
            } as GroupSettingsModalData,
          })
          .result.pipe(first())
      ),
      map((g) => updateGroup(g))
    )
  );

  readonly requestEditGroup$ = createEffect(() =>
    this.actions.pipe(
      ofType(requestEditGroup),
      withLatestFrom(this.state),
      switchMap(([_, state]) =>
        this.modalService
          .open(GroupSettingsModal, {
            size: 'lg',
            data: {
              new: false,
              user: state.user,
              group: this.state.select(getGroup),
            } as GroupSettingsModalData,
          })
          .result.pipe(first())
      ),
      map((g) => updateGroup(g))
    )
  );
}

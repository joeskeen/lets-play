import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { updateUser } from '../user/user.actions';
import { updateGroupUser, updateGroup, requestAddUser } from './group.actions';
import { map, filter } from 'rxjs/operators';

@Injectable()
export class GroupEffects {
  constructor(private state: Store<AppState>, private actions: Actions) {}

  readonly updateUser$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(updateUser),
        map((a) => updateGroupUser({ user: a.user }))
      ),
    { dispatch: false }
  );

  readonly addUserOnSessionUpdateIfOnlyOneUser$ = createEffect(() =>
    this.actions.pipe(
      ofType(updateGroup),
      filter((a) => a.group.users.length === 1),
      map(() => requestAddUser())
    )
  );
}

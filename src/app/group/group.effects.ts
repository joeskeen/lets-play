import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { updateUser } from '../user/user.actions';
import {
  updateGroupUser,
  updateGroup,
  requestAddMembers,
  requestCreateGroup,
  requestEditGroup,
  requestJoinGroup,
} from './group.actions';
import {
  map,
  filter,
  withLatestFrom,
  switchMap,
  first,
  tap,
} from 'rxjs/operators';
import { ModalService } from '@healthcatalyst/cashmere';
import {
  GroupSettingsComponent,
  GroupSettingsModalData,
} from './group-settings/group-settings.component';
import { getGroup } from './group.reducer';
import { AddGroupMembersModal } from './add-group-members/add-group-members.modal';
import { RandomNameService } from 'src/shared/random-name.service';
import { from } from 'rxjs';
import { IGroup } from './group';
import { TempSharedStorageService } from 'src/shared/temp-shared-storage.service';
import { JoinGroupModal } from './join-group/join-group.modal';

@Injectable()
export class GroupEffects {
  constructor(
    private state: Store<AppState>,
    private actions: Actions,
    private modalService: ModalService,
    private randomNameService: RandomNameService,
    private tempStorage: TempSharedStorageService
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
      filter((a) => a.group?.users?.length === 1),
      map(() => requestAddMembers())
    )
  );

  readonly addGroupCodeIfMissing$ = createEffect(() =>
    this.actions.pipe(
      ofType(updateGroup),
      withLatestFrom(this.state),
      filter(
        ([a, s]) =>
          s.group.users.length && s.group.supremeLeader && !a.group.joinCode
      ),
      switchMap((_) => from(this.randomNameService.getRandomName())),
      tap((n) => this.tempStorage.set(n, {})),
      map((n) =>
        updateGroup({ group: ({ joinCode: n } as Partial<IGroup>) as IGroup })
      )
    )
  );

  readonly addMembers$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(requestAddMembers),
        withLatestFrom(this.state),
        filter(([_, s]) => s.global.isUserSupremeLeader),
        switchMap(
          () =>
            this.modalService.open(AddGroupMembersModal, { size: 'md' }).result
        )
      ),
    { dispatch: false }
  );

  readonly joinGroup$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(requestJoinGroup),
        withLatestFrom(this.state),
        switchMap(
          () => this.modalService.open(JoinGroupModal, { size: 'md' }).result
        )
      ),
    { dispatch: false }
  );
}

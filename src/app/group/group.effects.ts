import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { updateUser } from '../user/user.actions';
import {
  updateGroupUser,
  updateGroup,
  requestAddMembers,
  requestJoinGroup,
  addUser,
} from './group.actions';
import {
  map,
  filter,
  withLatestFrom,
  switchMap,
  tap,
  distinctUntilChanged,
} from 'rxjs/operators';
import { ModalService, HcToasterService } from '@healthcatalyst/cashmere';
import { AddGroupMembersModal } from './add-group-members/add-group-members.modal';
import { RandomNameService } from 'src/shared/random-name.service';
import { from } from 'rxjs';
import { IGroup } from './group';
import { TempSharedStorageService } from 'src/shared/temp-shared-storage.service';
import { JoinGroupModal } from './join-group/join-group.modal';
import { CustomImageToast } from '../toasts/custom-image.toast';

@Injectable()
export class GroupEffects {
  constructor(
    private state: Store<AppState>,
    private actions: Actions,
    private modalService: ModalService,
    private randomNameService: RandomNameService,
    private tempStorage: TempSharedStorageService,
    private toasterService: HcToasterService
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
      withLatestFrom(this.state),
      filter(([_, s]) => s.global.isUserSupremeLeader),
      map(([_, s]) => s.group.users.length),
      filter((n) => n === 1),
      distinctUntilChanged(),
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

  readonly memberAdded = createEffect(
    () =>
      this.actions.pipe(
        ofType(addUser),
        withLatestFrom(this.state),
        filter(([a, s]) => a.user.uniqueId !== s.user.uniqueId),
        tap(([action]) =>
          this.toasterService.addToast({ type: 'custom' }, CustomImageToast, {
            header: `New group member`,
            body: `${action.user.name} has joined your group!`,
            imageUrl: action.user.avatarUrl,
          })
        )
      ),
    { dispatch: false }
  );

  readonly joined = createEffect(
    () =>
      this.actions.pipe(
        ofType(addUser),
        withLatestFrom(this.state),
        filter(([a, s]) => a.user.uniqueId === s.user.uniqueId),
        tap(([action, state]) =>
          this.toasterService.addToast({ type: 'custom' }, CustomImageToast, {
            header: `Welcome`,
            body: `You have joined the ${state.group.groupName} group!`,
            imageUrl: action.user.avatarUrl,
          })
        )
      ),
    { dispatch: false }
  );

  readonly joinGroup$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(requestJoinGroup),
        switchMap(
          () => this.modalService.open(JoinGroupModal, { size: 'md', data: { } }).result
        )
      ),
    { dispatch: false }
  );
}

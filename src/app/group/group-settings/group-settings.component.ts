import { Component, OnInit } from '@angular/core';
import { IGroup, GovernmentType } from '../group';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { IUser } from '../../user/user';
import { AppState } from '../../global/app.reducer';
import { Store } from '@ngrx/store';
import {
  resetGroupUsers,
  updateGroup,
  requestCancelEditGroup,
} from '../group.actions';
import { getGroup, GroupState } from '../group.reducer';
import { getUser } from 'src/app/user/user.reducer';
import { withLatestFrom, filter } from 'rxjs/operators';

@Component({
  selector: 'app-group-settings',
  templateUrl: `group-settings.component.html`,
  styleUrls: ['group-settings.component.scss'],
})
export class GroupSettingsComponent implements OnInit {
  readonly groupForm = new FormGroup({
    groupName: new FormControl('', [Validators.required]),
    governmentType: new FormControl('semi-direct democracy' as GovernmentType, [
      Validators.required,
    ]),
    supremeLeader: new FormControl(null, [Validators.required]),
  } as Record<keyof IGroup, FormControl>);
  readonly group$: Observable<GroupState>;
  readonly user$: Observable<IUser>;
  private groupMembers: IUser[] = [];

  constructor(private store: Store<AppState>) {
    this.group$ = store.select(getGroup);
    this.user$ = store.select(getUser);
  }

  ngOnInit() {
    this.group$
      .pipe(
        withLatestFrom(this.user$),
        filter(([g]) => g.editing)
      )
      .subscribe(([group, user]) => {
        this.groupMembers = group.users;
        this.groupForm.patchValue({
          groupName: group.groupName,
          governmentType: group.governmentType,
          supremeLeader: group.supremeLeader?.uniqueId,
        });
        if (
          (group.editing && group.isNew && !group.users.length) ||
          !group.supremeLeader
        ) {
          this.store.dispatch(
            resetGroupUsers({
              initialUser: { ...user, email: undefined },
            })
          );
        } else if (group.supremeLeader?.uniqueId === user.uniqueId) {
          this.groupForm.enable();
        } else {
          this.groupForm.disable();
        }
      });
  }

  saveGroup() {
    this.store.dispatch(
      updateGroup({
        group: {
          ...this.groupForm.value,
          supremeLeader: this.groupMembers.find(
            (u) => u.uniqueId === this.groupForm.controls.supremeLeader.value
          ),
        },
      })
    );
  }

  cancel() {
    this.store.dispatch(requestCancelEditGroup());
  }
}

export interface GroupSettingsModalData {
  group: Observable<IGroup>;
  user?: IUser;
  new: boolean;
}

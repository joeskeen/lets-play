import { Component, OnInit } from '@angular/core';
import { IGroup, GovernmentType } from './group';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { IUser } from '../user/user';
import { AppState } from '../global/app.reducer';
import { Store } from '@ngrx/store';
import { resetGroupUsers } from './group.actions';
import { getGroup } from './group.reducer';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Group Settings</hc-modal-header>
      <hc-modal-body [formGroup]="groupForm">
        <hc-form-field>
          <hc-label>Group name:</hc-label>
          <input hcInput formControlName="groupName" />
        </hc-form-field>
        <hc-form-field>
          <hc-label>Group supreme leader:</hc-label>
          <input hcInput formControlName="supremeLeader" />
        </hc-form-field>
        <hc-form-field>
          <hc-label>Group government type:</hc-label>
          <input hcInput formControlName="governmentType" />
        </hc-form-field>
        <div>
          <h4>Group Members</h4>
          <div *ngFor="let user of (group$ | async).users">
            {{ user.name }}
          </div>
        </div>
        <pre><code>{{group$ | async | json}}</code></pre>
      </hc-modal-body>
      <hc-modal-footer>
        <button hc-button buttonStyle="secondary">Cancel</button>
        <button
          hc-button
          [disabled]="
            groupForm.invalid || groupForm.pristine || groupForm.disabled
          "
        >
          Save
        </button>
      </hc-modal-footer>
    </hc-modal>
  `,
})
export class GroupSettingsModal implements OnInit {
  readonly groupForm = new FormGroup({
    groupName: new FormControl('', [Validators.required]),
    governmentType: new FormControl('semi-direct democracy' as GovernmentType, [
      Validators.required,
    ]),
    supremeLeader: new FormControl(null, [Validators.required]),
  } as Record<keyof IGroup, FormControl>);
  readonly group$: Observable<IGroup>;

  constructor(
    private activeModal: ActiveModal<GroupSettingsModalData>,
    private store: Store<AppState>
  ) {
    this.group$ = store.select(getGroup);
  }

  ngOnInit() {
    this.activeModal.data.group.subscribe((group) => {
      this.groupForm.patchValue({
        groupName: group.groupName,
        governmentType: group.governmentType,
        supremeLeader: group.supremeLeader?.uniqueId,
      });
      if (
        group.supremeLeader?.uniqueId === this.activeModal.data.user.uniqueId
      ) {
        this.groupForm.enable();
      } else {
        this.groupForm.disable();
      }
    });
    if (this.activeModal.data.new) {
      this.store.dispatch(
        resetGroupUsers({
          initialUser: { ...this.activeModal.data.user, email: undefined },
        })
      );
    }
  }

  async addUser() {}

  async saveGroup() {
    this.activeModal.close(this.groupForm.value);
  }

  cancel() {
    this.activeModal.dismiss();
  }
}

export interface GroupSettingsModalData {
  group: Observable<IGroup>;
  user?: IUser;
  new: boolean;
}

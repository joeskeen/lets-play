import { Component, OnInit } from '@angular/core';
import { IGroup, GovernmentType } from './group';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Group Settings</hc-modal-header>
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

  constructor(private activeModal: ActiveModal<GroupSettingsModalData>) {}

  ngOnInit() {
    this.activeModal.data.group.subscribe((group) => {
      this.groupForm.patchValue({
        groupName: group.groupName,
        governmentType: group.governmentType,
        supremeLeader: group.supremeLeader,
      });
    });
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
}

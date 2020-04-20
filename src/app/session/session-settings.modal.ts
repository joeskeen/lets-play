import { Component, OnInit } from '@angular/core';
import { ISession, GovernmentType } from './session';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Session Settings</hc-modal-header>
    </hc-modal>
  `,
})
export class SessionSettingsModal implements OnInit {
  readonly sessionForm = new FormGroup({
    sessionName: new FormControl('', [Validators.required]),
    governmentType: new FormControl('semi-direct democracy' as GovernmentType, [
      Validators.required,
    ]),
    supremeLeader: new FormControl(null, [Validators.required]),
  } as Record<keyof ISession, FormControl>);

  constructor(private activeModal: ActiveModal<SessionSettingsModalData>) {}

  ngOnInit() {
    this.activeModal.data.session.subscribe((session) => {
      this.sessionForm.patchValue({
        sessionName: session.sessionName,
        governmentType: session.governmentType,
        supremeLeader: session.supremeLeader,
      });
    });
  }

  async addUser() {}

  async saveSession() {
    this.activeModal.close(this.sessionForm.value);
  }

  cancel() {
    this.activeModal.dismiss();
  }
}

export interface SessionSettingsModalData {
  session: Observable<ISession>;
}

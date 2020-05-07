import { Component } from '@angular/core';
import { ActiveModal } from '@healthcatalyst/cashmere';

const global = window as any;

@Component({
  templateUrl: 'about.modal.html',
  styleUrls: ['about.modal.scss'],
})
export class AboutModal {
  readonly gitHash = global.gitHash;
  readonly buildTimestamp = isNaN(+global.buildTimestamp)
    ? new Date(global.buildTimestamp)
    : new Date(+global.buildTimestamp);

  constructor(private activeModal: ActiveModal) {}

  ok() {
    this.activeModal.dismiss();
  }
}

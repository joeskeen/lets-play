import { Component, OnInit } from '@angular/core';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as md5 from 'md5';
import { map } from 'rxjs/operators';
import { IUser } from './user';
import { v4 as uuid } from 'uuid';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Welcome</hc-modal-header>
      <hc-modal-body>
        <div class="side-by-side">
          <div>
            <img class="avatar" [src]="profileForm.controls.avatarUrl.value" />
          </div>
          <div class="flex1">
            <hc-form-field>
              <hc-label>Your name:</hc-label>
              <input hcInput [formControl]="profileForm.controls.name" />
              <hc-error>Input is required</hc-error>
            </hc-form-field>
            <hc-form-field>
              <hc-label>Your email:</hc-label>
              <input
                hcInput
                [formControl]="profileForm.controls.email"
                (keyup.enter)="save()"
              />
              <hc-error *ngIf="profileForm.controls.email.errors?.required">
                Input is required
              </hc-error>
              <hc-error *ngIf="profileForm.controls.email.errors?.pattern">
                Must be a valid email
              </hc-error>
            </hc-form-field>
            <span class="subtext">
              Your email will only be used to generate your avatar via
              <a href="https://gravatar.com" target="_blank">Gravatar</a>
              and will not be shared.
            </span>
          </div>
        </div>
      </hc-modal-body>
      <hc-modal-footer>
        <button
          hc-button
          buttonStyle="secondary"
          *ngIf="activeModal.data.canCancel"
          (click)="activeModal.dismiss()"
        >
          Cancel
        </button>
        <button hc-button (click)="save()" [disabled]="profileForm.invalid">
          Save
        </button>
      </hc-modal-footer>
    </hc-modal>
  `,
  styles: [
    `
      .side-by-side {
        display: flex;
        flex-direction: row;
      }
      .side-by-side .flex1 {
        flex: 1;
        margin-left: 15px;
      }
      img.avatar {
        width: 150px;
        height: 150px;
        border-radius: 125px;
        border: solid black 3px;
      }
      span.subtext {
        display: block;
        font-style: italic;
      }
      hc-modal-footer button {
        margin-left: 10px;
      }
    `,
  ],
})
export class UserSetupModal implements OnInit {
  private readonly emptyAvatar =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII';
  private readonly avatarSize = 250;

  readonly profileForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    avatarUrl: new FormControl(this.emptyAvatar),
    uniqueId: new FormControl(undefined),
  });

  constructor(public activeModal: ActiveModal<IUserSetupData>) {}

  ngOnInit() {
    if (this.activeModal.data.user) {
      this.profileForm.patchValue(this.activeModal.data.user);
    }

    this.profileForm.controls.email.valueChanges
      .pipe(map((email) => this.createAvatarUrl(email)))
      .subscribe((url) => this.profileForm.controls.avatarUrl.patchValue(url));
  }

  save() {
    if (this.profileForm.invalid) {
      return;
    }
    const user: IUser = this.profileForm.value;
    if (!user.uniqueId) {
      user.uniqueId = uuid();
    }
    this.activeModal.close(user);
  }

  private createAvatarUrl(email: string): string {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return this.emptyAvatar;
    }
    const hash = md5(normalizedEmail);

    return `https://www.gravatar.com/avatar/${hash}?s=${this.avatarSize}&r=g&d=monsterid`;
  }
}

export interface IUserSetupData {
  canCancel: boolean;
  user: IUser;
}

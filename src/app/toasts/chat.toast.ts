import { Component } from '@angular/core';
import { IUser } from '../user/user';

@Component({
  template: `
    <div class="custom-toast chat">
      <div class="custom-toast-icon">
        <img [src]="user?.avatarUrl" />
      </div>
      <div>
        <div class="custom-toast-header">New message from {{ user?.name }}</div>
        <div class="custom-toast-body">{{ message }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat {
        background-color: #006d9a;
      }
    `,
  ],
})
export class ChatToast {
  message: string;
  user: IUser;
}

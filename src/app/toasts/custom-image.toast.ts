import { Component } from '@angular/core';

@Component({
  template: `
    <div class="custom-toast chat" [style.backgroundColor]="toastColor">
      <div class="custom-toast-icon">
        <img [src]="imageUrl" />
      </div>
      <div>
        <div class="custom-toast-header">{{ header }}</div>
        <div class="custom-toast-body">{{ body }}</div>
      </div>
    </div>
  `,
  styles: [`
    .chat {
      background-color: #006d9a;
    }
  `],
})
export class CustomImageToast {
  header: string;
  body: string;
  imageUrl: string;
  toastColor: string;
}

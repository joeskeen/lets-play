import { Injectable, ErrorHandler } from '@angular/core';
import { HcToasterService } from '@healthcatalyst/cashmere';

@Injectable({ providedIn: 'root' })
export class UncaughtErrorHandlerService implements ErrorHandler {
  constructor(private toasterService: HcToasterService) {}
  handleError(error: any) {
    console.error(error);
    this.toasterService.addToast({
      type: 'alert',
      header: 'Oops',
      body: 'Something went wrong. Refresh the page and try again.',
    });
  }
}

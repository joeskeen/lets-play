import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, ErrorHandler } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CashmereModule } from './cashmere.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { ClipboardModule } from 'ngx-clipboard';
import { ProfileModule } from './profile/profile.module';
import { ToastsModule } from './toasts/toasts.module';
import { UncaughtErrorHandlerService } from './error-handling/uncaught-error-handler.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CashmereModule,
    AppRoutingModule,
    WebrtcModule,
    ClipboardModule,
    ProfileModule,
    ToastsModule,
  ],
  providers: [{ provide: ErrorHandler, useClass: UncaughtErrorHandlerService }],
  bootstrap: [AppComponent],
})
export class AppModule {}

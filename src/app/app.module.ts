import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CashmereModule } from './cashmere.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { ClipboardModule } from 'ngx-clipboard';
import { ProfileModule } from './profile/profile.module';
import { ToastsModule } from './toasts/toasts.module';

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
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

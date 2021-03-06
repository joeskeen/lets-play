import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, ErrorHandler } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CashmereModule } from './cashmere.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { ClipboardModule } from 'ngx-clipboard';
import { UserModule } from './user/user.module';
import { ToastsModule } from './toasts/toasts.module';
import { UncaughtErrorHandlerService } from './error-handling/uncaught-error-handler.service';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from 'src/environments/environment';
import { appReducer } from './global/app.reducer';
import { GroupModule } from './group/group.module';
import { AppEffects } from './global/app.effects';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { GameModule } from './game/game.module';
import { AboutModal } from './about/about.modal';

@NgModule({
  declarations: [AppComponent, AboutModal],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CashmereModule,
    AppRoutingModule,
    WebrtcModule,
    ClipboardModule,
    HttpClientModule,
    UserModule,
    GroupModule,
    ToastsModule,
    StoreModule.forRoot({ global: appReducer}),
    EffectsModule.forRoot([AppEffects]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production,
    }),
    GameModule
  ],
  entryComponents: [AboutModal],
  providers: [{ provide: ErrorHandler, useClass: UncaughtErrorHandlerService }],
  bootstrap: [AppComponent],
})
export class AppModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashmereModule } from '../cashmere.module';
import { UserSetupModal } from './user-setup.modal';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { UserReducer } from './user.reducer';
import { UserEffects } from './user.effects';
import { StorageModule } from '@ngx-pwa/local-storage';

const userFeatureKey = 'user';

@NgModule({
  imports: [
    CommonModule,
    CashmereModule,
    FormsModule,
    ReactiveFormsModule,
    StorageModule,
    StoreModule.forFeature(userFeatureKey, { user: UserReducer }),
    EffectsModule.forFeature([UserEffects]),
  ],
  providers: [UserEffects],
  declarations: [UserSetupModal],
  exports: [UserSetupModal],
  entryComponents: [UserSetupModal],
})
export class UserModule {}

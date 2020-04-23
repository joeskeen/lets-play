import { NgModule } from '@angular/core';
import { CashmereModule } from '../cashmere.module';
import { GroupSettingsModal } from './group-settings.modal';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { GroupReducer } from './group.reducer';
import { EffectsModule } from '@ngrx/effects';
import { GroupEffects } from './group.effects';

const groupFeatureKey = 'group';

@NgModule({
  imports: [
    CashmereModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(groupFeatureKey, GroupReducer),
    EffectsModule.forFeature([GroupEffects]),
  ],
  declarations: [GroupSettingsModal],
  exports: [GroupSettingsModal],
  entryComponents: [GroupSettingsModal],
})
export class GroupModule {}

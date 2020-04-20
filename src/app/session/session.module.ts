import { NgModule } from '@angular/core';
import { CashmereModule } from '../cashmere.module';
import { SessionSettingsModal } from './session-settings.modal';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [CashmereModule, CommonModule, FormsModule, ReactiveFormsModule],
  declarations: [SessionSettingsModal],
  exports: [SessionSettingsModal],
  entryComponents: [SessionSettingsModal],
})
export class SessionModule {}

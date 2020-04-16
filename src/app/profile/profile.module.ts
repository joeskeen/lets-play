import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashmereModule } from '../cashmere.module';
import { ProfileSetupModal } from './profile-setup.modal';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, CashmereModule, FormsModule, ReactiveFormsModule],
  declarations: [ProfileSetupModal],
  exports: [ProfileSetupModal],
  entryComponents: [ProfileSetupModal],
})
export class ProfileModule {}

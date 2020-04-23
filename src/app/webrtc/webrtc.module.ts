import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashmereModule } from '../cashmere.module';
import { InitiateConnectionModal } from './initiate-connection.modal';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CompleteConnectionModal } from './complete-connection.modal';

@NgModule({
  imports: [CommonModule, CashmereModule, ReactiveFormsModule, FormsModule],
  declarations: [InitiateConnectionModal, CompleteConnectionModal],
  exports: [InitiateConnectionModal, CompleteConnectionModal],
  entryComponents: [InitiateConnectionModal, CompleteConnectionModal],
})
export class WebrtcModule {}

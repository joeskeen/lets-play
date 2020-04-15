import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashmereModule } from '../cashmere.module';
import { CreateSessionModal } from './create-session.modal';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { JoinSessionModal } from './join-session.modal';

@NgModule({
  imports: [CommonModule, CashmereModule, ReactiveFormsModule, FormsModule],
  declarations: [CreateSessionModal, JoinSessionModal],
  exports: [CreateSessionModal, JoinSessionModal],
  entryComponents: [CreateSessionModal, JoinSessionModal],
})
export class WebrtcModule {}

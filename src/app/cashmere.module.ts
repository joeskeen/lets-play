import { NgModule } from '@angular/core';
import {
  ModalModule,
  FormFieldModule,
  InputModule,
  ButtonModule,
} from '@healthcatalyst/cashmere';

@NgModule({
  exports: [ModalModule, FormFieldModule, InputModule, ButtonModule],
})
export class CashmereModule {}

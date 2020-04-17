import { NgModule } from '@angular/core';
import {
  ModalModule,
  FormFieldModule,
  InputModule,
  ButtonModule,
  IconModule,
  ToasterModule,
  NavbarModule,
  PopModule,
  AccordionModule,
} from '@healthcatalyst/cashmere';

@NgModule({
  exports: [
    ModalModule,
    FormFieldModule,
    InputModule,
    ButtonModule,
    IconModule,
    ToasterModule,
    InputModule,
    FormFieldModule,
    NavbarModule,
    PopModule,
    AccordionModule,
  ],
})
export class CashmereModule {}

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
  ListModule,
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
    ListModule,
  ],
})
export class CashmereModule {}

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
  ChipModule,
  DrawerModule,
  TileModule,
} from '@healthcatalyst/cashmere';
import { CommonModule } from '@angular/common';

@NgModule({
  exports: [
    CommonModule,
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
    ChipModule,
    DrawerModule,
    TileModule
  ],
})
export class CashmereModule {}

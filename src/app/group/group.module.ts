import { NgModule } from '@angular/core';
import { CashmereModule } from '../cashmere.module';
import { GroupSettingsComponent } from './group-settings/group-settings.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { GroupReducer } from './group.reducer';
import { EffectsModule } from '@ngrx/effects';
import { GroupEffects } from './group.effects';
import { GroupMembersComponent } from './group-members/group-members.component';
import { UserModule } from '../user/user.module';
import { AddGroupMembersModal } from './add-group-members/add-group-members.modal';
import { JoinGroupModal } from './join-group/join-group.modal';
import { ClipboardModule } from 'ngx-clipboard';

const groupFeatureKey = 'group';

@NgModule({
  imports: [
    CashmereModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forFeature(groupFeatureKey, GroupReducer),
    EffectsModule.forFeature([GroupEffects]),
    UserModule,
    ClipboardModule
  ],
  declarations: [GroupSettingsComponent, GroupMembersComponent, AddGroupMembersModal, JoinGroupModal],
  exports: [GroupSettingsComponent, GroupMembersComponent],
  entryComponents: [GroupSettingsComponent, AddGroupMembersModal, JoinGroupModal],
})
export class GroupModule {}

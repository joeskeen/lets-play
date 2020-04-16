import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { ModalService, HcToasterService } from '@healthcatalyst/cashmere';
import {
  CreateSessionModal,
  ICreateSessionModalData,
} from './webrtc/create-session.modal';
import {
  JoinSessionModal,
  IJoinSessionModalData,
} from './webrtc/join-session.modal';
import { first, filter } from 'rxjs/operators';
import { RtcClient } from './webrtc/rtc-client';
import { IUser } from './models/user';
import {
  ProfileSetupModal,
  IProfileSetupData,
} from './profile/profile-setup.modal';
import { LocalSettingsService } from './services/local-settings.service';
import { userSettingsKey } from './services/global-settings-keys';
import { IChatMessage } from './webrtc/messages';
import { ChatToast } from './toasts/chat.toast';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'p2p-game';
  client: RtcClient;
  user: IUser;

  constructor(
    private modalService: ModalService,
    private toasterService: HcToasterService,
    private localSettings: LocalSettingsService
  ) {}

  async ngOnInit() {
    this.user = await this.localSettings.get<IUser>(userSettingsKey);
    if (!this.user) {
      this.editUser(true);
    }
  }

  async newSession() {
    this.client = await this.modalService
      .open(CreateSessionModal, {
        size: 'lg',
        data: {
          user: { name: this.user.name, avatarUrl: this.user.avatarUrl },
        } as ICreateSessionModalData,
      })
      .result.pipe(first())
      .toPromise();
    this.clientConnected();
  }

  async joinSession() {
    this.client = await this.modalService
      .open(JoinSessionModal, {
        size: 'lg',
        data: {
          user: { name: this.user.name, avatarUrl: this.user.avatarUrl },
        } as IJoinSessionModalData,
      })
      .result.pipe(first())
      .toPromise();
    this.clientConnected();
  }

  async editUser(mandatory = false) {
    const user: IUser = await this.modalService
      .open(ProfileSetupModal, {
        size: 'md',
        data: { user: this.user, canCancel: !mandatory } as IProfileSetupData,
        ignoreEscapeKey: mandatory,
        ignoreOverlayClick: mandatory,
      })
      .result.pipe(first())
      .toPromise();
    this.user = user;
    await this.localSettings.set(userSettingsKey, user);
  }

  clientConnected() {
    this.client.receivedMessage$
      .pipe(filter((m) => m.type === 'chat'))
      .subscribe((m: IChatMessage) => {
        this.toasterService.addToast({ type: 'custom' }, ChatToast, {
          message: m.data,
          user: this.client.peer,
        });
      });
  }
}

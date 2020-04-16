import { Component, OnInit } from '@angular/core';
import { ModalService, HcToasterService } from '@healthcatalyst/cashmere';
import { CreateSessionModal } from './webrtc/create-session.modal';
import { JoinSessionModal } from './webrtc/join-session.modal';
import { first } from 'rxjs/operators';
import { RtcClient } from './webrtc/rtc-client';
import { IUser } from './models/user';
import {
  ProfileSetupModal,
  IProfileSetupData,
} from './profile/profile-setup.modal';
import { LocalSettingsService } from './services/local-settings.service';
import { userSettingsKey } from './services/global-settings-keys';

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
      .open(CreateSessionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
    this.client.receivedMessage$.subscribe((m) =>
      this.toasterService.addToast({
        type: 'success',
        header: 'Message Received',
        body: m,
      })
    );
  }

  async joinSession() {
    this.client = await this.modalService
      .open(JoinSessionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
    this.client.receivedMessage$.subscribe((m) =>
      this.toasterService.addToast({
        type: 'success',
        header: 'Message Received',
        body: m,
      })
    );
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
}

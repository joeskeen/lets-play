import { Component } from '@angular/core';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { FormControl, Validators } from '@angular/forms';
import { ConnectionManagerService } from 'src/app/webrtc/connection-manager.service';
import { TempSharedStorageService } from 'src/shared/temp-shared-storage.service';
import { AppState } from 'src/app/global/app.reducer';
import { Store, select } from '@ngrx/store';
import { getUser } from 'src/app/user/user.reducer';
import { RtcService } from 'src/app/webrtc/rtc.service';
import { IUser } from 'src/app/user/user';
import { first, map, filter } from 'rxjs/operators';

@Component({
  templateUrl: 'join-group.modal.html',
  styleUrls: ['join-group.modal.scss'],
})
export class JoinGroupModal {
  readonly groupCodeControl = new FormControl('', [Validators.required]);
  private user: IUser;

  constructor(
    public activeModal: ActiveModal,
    private connectionManager: ConnectionManagerService,
    private tempStorage: TempSharedStorageService,
    private toasterService: HcToasterService,
    private store: Store<AppState>,
    private rtcService: RtcService
  ) {
    this.store.pipe(select(getUser)).subscribe((user) => (this.user = user));
  }

  async join() {
    const groupCode = this.groupCodeControl.value;
    const groupConnections = await this.tempStorage.get(groupCode);
    if (!groupConnections) {
      this.toasterService.addToast({
        type: 'alert',
        header: 'Oops',
        body: `Couldn't find a group with that code. Double check the code and make sure the host is accepting new members.`,
      });
      return;
    }
    const client = await this.rtcService.create(this.user, async (offer) => {
      const storageKey = `${groupCode}/${this.user.uniqueId}`;
      await this.tempStorage.set(storageKey, {offer});
      const response = await this.tempStorage
        .watch<IHandshake>(storageKey)
        .pipe(
          map((r) => r.hostResponse),
          filter((r) => !!r),
          first()
        )
        .toPromise();
      return response;
    });
    this.connectionManager.addClient(client);
    this.activeModal.close();
  }
}

interface IHandshake {
  offer: RTCSessionDescriptionInit;
  hostResponse?: RTCSessionDescriptionInit;
}

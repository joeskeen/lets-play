import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, interval } from 'rxjs';
import { GroupState, getGroup } from '../group.reducer';
import { Store, Action } from '@ngrx/store';
import { AppState } from 'src/app/global/app.reducer';
import {
  takeUntil,
  filter,
  first,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { updateGroup, addUser, UpdateGroupAction } from '../group.actions';
import { IGroup } from '../group';
import { RandomNameService } from 'src/shared/random-name.service';
import { environment } from 'src/environments/environment';
import { TempSharedStorageService } from 'src/shared/temp-shared-storage.service';
import { ConnectionManagerService } from 'src/app/webrtc/connection-manager.service';
import { RtcService } from 'src/app/webrtc/rtc.service';
import { IUser } from 'src/app/user/user';
import { getUser } from 'src/app/user/user.reducer';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { IMessage } from 'src/app/webrtc/messages';
import { connectionMessageReceived } from 'src/app/global/app.actions';
import { CustomImageToast } from 'src/app/toasts/custom-image.toast';

type UserOfferHash = Record<
  string,
  { offer: RTCSessionDescriptionInit; hostResponse?: RTCSessionDescriptionInit }
>;

@Component({
  templateUrl: 'add-group-members.modal.html',
  styleUrls: ['add-group-members.modal.scss'],
})
export class AddGroupMembersModal implements OnInit, OnDestroy {
  readonly group$: Observable<GroupState>;
  readonly user$: Observable<IUser>;
  readonly destroyed = new Subject();
  private joinCode: string;
  private acknowledgedConnectionRequests: string[] = [];
  private user: IUser;
  private group: IGroup;

  constructor(
    private store: Store<AppState>,
    private tempDataService: TempSharedStorageService,
    private connectionManager: ConnectionManagerService,
    private rtcService: RtcService,
    public activeModal: ActiveModal,
    private toasterService: HcToasterService
  ) {
    this.group$ = store.select(getGroup);
    this.user$ = store.select(getUser);
  }

  ngOnInit() {
    this.group$
      .pipe(
        withLatestFrom(this.user$),
        takeUntil(this.destroyed),
        filter(([g]) => !!g.joinCode),
        tap(async ([g, u]) => {
          this.joinCode = g.joinCode;
          this.user = u;
          this.group = g;
          await this.tempDataService.set(g.joinCode, {});
        }),
        switchMap(([g]) =>
          this.tempDataService.watch<UserOfferHash>(g.joinCode)
        ),
        filter((h) => !!h),
        takeUntil(this.destroyed)
      )
      .subscribe((h) => {
        const userIds = Object.keys(h);
        const unacknowledged = userIds.filter(
          (uid) => !this.acknowledgedConnectionRequests.includes(uid)
        );
        unacknowledged.forEach(async (uid) => {
          this.acknowledgedConnectionRequests.push(uid);
          const client = await this.rtcService.join(
            h[uid].offer,
            this.user,
            async (myOffer) =>
              this.tempDataService.set(
                `${this.joinCode}/${uid}/hostResponse`,
                myOffer
              )
          );
          this.connectionManager.addClient(client);
          this.connectionManager.clients
            .filter((c) => c !== client)
            .forEach((c) => this.connectionManager.connectClients(client, c));
          this.store.dispatch(addUser({ user: client.peer }));
          // set initial group state
          const message: IMessage = {
            type: '@ngrx-action',
            data: { originatorId: this.user.uniqueId, action: updateGroup({ group: this.group }) },
          };
          client.sendMessage(message);
          await this.tempDataService.delete(`${this.joinCode}/${uid}`);
        });
      });
  }

async ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
    try {
      await this.tempDataService.delete(this.joinCode);
    } catch { /* ignore clean-up errors */ }
  }
}

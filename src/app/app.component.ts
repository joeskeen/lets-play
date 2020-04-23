import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { IUser } from './user/user';
import { Store, select } from '@ngrx/store';
import { AppState } from './global/app.reducer';
import { requestLoadUser, requestEditUser } from './user/user.actions';
import { Observable } from 'rxjs';
import { getUser } from './user/user.reducer';
import { ModalService } from '@healthcatalyst/cashmere';
import { requestCreateGroup, requestJoinGroup } from './group/group.actions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  readonly user$: Observable<IUser>;

  constructor(
    private store: Store<AppState>,
    private modalService: ModalService
  ) {
    this.user$ = store.pipe(select(getUser));
    this.modalService.allowMultiple = true;
  }

  async ngOnInit() {
    this.store.dispatch(requestLoadUser());
  }

  createGroup() {
    this.store.dispatch(requestCreateGroup());
  }

  joinGroup() {
    this.store.dispatch(requestJoinGroup());
  }

  // async newSession() {
  //   this.client = await this.modalService
  //     .open(CreateSessionModal, {
  //       size: 'lg',
  //       data: {
  //         user: {
  //           name: this.user.name,
  //           avatarUrl: this.user.avatarUrl,
  //           uniqueId: this.user.uniqueId,
  //           isSupremeLeader: true,
  //         },
  //       } as ICreateSessionModalData,
  //     })
  //     .result.pipe(first())
  //     .toPromise();
  //   this.clientConnected();
  // }

  // async joinSession() {
  //   this.client = await this.modalService
  //     .open(JoinSessionModal, {
  //       size: 'lg',
  //       data: {
  //         user: {
  //           name: this.user.name,
  //           avatarUrl: this.user.avatarUrl,
  //           uniqueId: this.user.uniqueId,
  //         },
  //       } as IJoinSessionModalData,
  //     })
  //     .result.pipe(first())
  //     .toPromise();
  //   this.clientConnected();
  // }

  async editUser() {
    this.store.dispatch(requestEditUser({ mandatory: false }));
  }
}

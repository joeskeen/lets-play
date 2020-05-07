import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { IUser } from './user/user';
import { Store, select } from '@ngrx/store';
import { AppState } from './global/app.reducer';
import { requestLoadUser, requestEditUser } from './user/user.actions';
import { Observable, fromEvent } from 'rxjs';
import { getUser } from './user/user.reducer';
import { ModalService } from '@healthcatalyst/cashmere';
import {
  requestCreateGroup,
  requestJoinGroup,
  requestCancelEditGroup,
} from './group/group.actions';
import { getGroup, GroupState } from './group/group.reducer';
import { AboutModal } from './about/about.modal';
import { first, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  readonly user$: Observable<IUser>;
  readonly group$: Observable<GroupState>;

  constructor(
    private store: Store<AppState>,
    private modalService: ModalService
  ) {
    this.user$ = store.pipe(select(getUser));
    this.group$ = store.pipe(select(getGroup));
    this.modalService.allowMultiple = true;
  }

  async ngOnInit() {
    this.store.dispatch(requestLoadUser());
    // wait for the user to be initialized before checking hash
    await this.user$
      .pipe(
        filter((u) => !!u.name && !!u.email),
        first()
      )
      .toPromise();

    this.checkHash(window.location.hash);
    fromEvent(window, 'hashchange').subscribe(() =>
      this.checkHash(window.location.hash)
    );
  }

  async checkHash(hash: string) {
    if (!hash || hash.length === 1) {
      return;
    }
    hash = hash.replace(/^#/, '').trim();
    if (hash) {
      this.joinGroup();
    }
  }

  createGroup() {
    this.store.dispatch(requestCreateGroup());
  }

  joinGroup() {
    this.store.dispatch(requestJoinGroup());
  }

  onGroupSettingsClosed() {
    this.store.dispatch(requestCancelEditGroup());
  }

  async editUser() {
    this.store.dispatch(requestEditUser({ mandatory: false }));
  }

  about() {
    this.modalService.open(AboutModal, { size: 'md' });
  }
}

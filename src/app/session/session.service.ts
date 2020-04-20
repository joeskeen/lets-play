import { Injectable } from '@angular/core';
import { ISession } from './session';
import { Session } from 'protractor';
import { IUser } from '../user/user';
import { ModalService } from '@healthcatalyst/cashmere';
import {
  SessionSettingsModal,
  SessionSettingsModalData,
} from './session-settings.modal';
import { Observable, Subject } from 'rxjs';
import { UserService } from '../user/user.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _currentSession = new Subject<ISession>();
  readonly currentSession$ = this._currentSession.asObservable();

  constructor(private modalService: ModalService, userService: UserService) {}

  createSession(sessionCreator: IUser) {
    const session = {
      governmentType: 'semi-direct democracy',
      users: [sessionCreator],
      supremeLeader: sessionCreator,
    } as ISession;
    this._currentSession.next(session);
  }

  joinSession(session: ISession) {
    this.currentSession = session;
  }

  sessionSettings() {}
}

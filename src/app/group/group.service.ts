// import { Injectable } from '@angular/core';
// import { IGroup } from './group';
// import { Session } from 'protractor';
// import { IUser } from '../user/user';
// import { ModalService } from '@healthcatalyst/cashmere';
// import {
//   GroupSettingsModal,
//   SessionSettingsModalData,
// } from './group-settings.modal';
// import { Observable, Subject } from 'rxjs';
// import { UserService } from '../user/user.service';

// @Injectable({ providedIn: 'root' })
// export class SessionService {
//   private readonly _currentSession = new Subject<IGroup>();
//   readonly currentSession$ = this._currentSession.asObservable();

//   constructor(private modalService: ModalService, userService: UserService) {}

//   createSession(sessionCreator: IUser) {
//     const session = {
//       governmentType: 'semi-direct democracy',
//       users: [sessionCreator],
//       supremeLeader: sessionCreator,
//     } as IGroup;
//     this._currentSession.next(session);
//   }

//   joinSession(session: IGroup) {
//     this.currentSession = session;
//   }

//   sessionSettings() {}
// }

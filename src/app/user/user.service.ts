// import { Injectable } from '@angular/core';
// import { LocalSettingsService } from '../services/local-settings.service';
// import { BehaviorSubject } from 'rxjs';
// import { IUser } from './user';
// import { ModalService } from '@healthcatalyst/cashmere';
// import { UserSetupModal, IUserSetupData } from './user-setup.modal';
// import { first } from 'rxjs/operators';

// const globalUserSettingsKey = 'global:user';

// @Injectable({ providedIn: 'root' })
// export class UserService {
//   private readonly _user = new BehaviorSubject<IUser>(undefined);
//   readonly user$ = this._user.asObservable();

//   constructor(
//     private localSettings: LocalSettingsService,
//     private modalService: ModalService
//   ) {}

//   async loadUser() {
//     let user = await this.localSettings.get<IUser>(globalUserSettingsKey);
//     if (!user) {
//       user = await this.editUser(true);
//     }
//     this._user.next(user);
//   }

//   async editUser(mandatory = false) {
//     const user: IUser = await this.modalService
//       .open(UserSetupModal, {
//         size: 'md',
//         data: {
//           canCancel: !mandatory,
//           user: this._user.value || {},
//         } as IUserSetupData,
//       })
//       .result.pipe(first())
//       .toPromise();

//     // if (!user.uniqueId) {
//     //   user.uniqueId = Symbol();
//     // }

//     await this.localSettings.set(globalUserSettingsKey, user);
//     return user;
//   }
// }

import { createAction, props } from '@ngrx/store';
import { IGroup, IInitiative } from './group';
import { IUser } from '../user/user';

const groupActionKey = (type: string) => `group:${type}`;

export const requestCreateGroup = createAction(groupActionKey('requestCreate'));
export const updateGroup = createAction(
  groupActionKey('update'),
  props<{ group: IGroup }>()
);

export const requestAddUser = createAction(groupActionKey('requestAddNewUser'));
export const requestRemoveUser = createAction(
  groupActionKey('requestRemoveUser'),
  props<{ user: IUser }>()
);
export const requestConnectUsers = createAction(
  groupActionKey('connectUsers'),
  props<{ users: [IUser, IUser] }>()
);
export const removeUser = createAction(
  groupActionKey('removeUser'),
  props<{ user: IUser }>()
);
export const addUser = createAction(
  groupActionKey('addUser'),
  props<{ user: IUser }>()
);
export const updateGroupUser = createAction(
  groupActionKey('updateGroupUser'),
  props<{ user: IUser }>()
);

export const requestCreateInitiative = createAction(
  groupActionKey('requestCreateInitiative')
);
export const createInitiative = createAction(
  groupActionKey('createInitiative'),
  props<{ initiative: IInitiative; champion: IUser }>()
);
export const supportInitiative = createAction(
  groupActionKey('supportInitiative'),
  props<{ initiative: IInitiative; supporter: IUser }>()
);
export const requestExecuteInitiative = createAction(
  groupActionKey('requestExecuteInitiative'),
  props<{ initiative: IInitiative }>()
);
export const withdrawInitiative = createAction(
  groupActionKey('withdrawInitiative'),
  props<{ initiative: IInitiative }>()
);
export const updateInitiative = createAction(
  groupActionKey('updateInitiative'),
  props<{ initiative: IInitiative }>()
);

export const installNewSupremeLeader = createAction(
  groupActionKey('installNewSupremeLeader'),
  props<{ newSupremeLeader: IUser }>()
);

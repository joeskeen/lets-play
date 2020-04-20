import { createAction, props } from '@ngrx/store';
import { IUser } from './user';

const userActionType = (t: string) => `user:${t}`;

export type RequestLoadUserAction = ReturnType<typeof requestLoadUser>;
export const requestLoadUser = createAction(userActionType('request-load'));

export type RequestEditUserAction = ReturnType<typeof requestEditUser>;
export const requestEditUser = createAction(
  userActionType('edit'),
  props<{ mandatory: boolean }>()
);

export type UpdateUserAction = ReturnType<typeof updateUser>;
export const updateUser = createAction(
  userActionType('update'),
  props<{ user: IUser }>()
);

import { IUser } from './user';
import { createReducer, on, createSelector } from '@ngrx/store';
import { updateUser } from './user.actions';
import { ISelector } from '../redux/selector';
import { v4 as uuid } from 'uuid';
import { AppState } from '../global/app.reducer';

export const EMPTY_AVATAR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII';

export type UserState = IUser;

export const initialState: UserState = {
  name: '',
  email: '',
  uniqueId: uuid(),
  avatarUrl: EMPTY_AVATAR,
};

export const UserReducer = createReducer(
  initialState,
  on(updateUser, (state, action) => ({ ...state, ...action.user }))
);

export const getUser = (state: AppState) => state.user;
export const getPublicUser = createSelector(
  getUser,
  (u) =>
    ({ name: u.name, avatarUrl: u.avatarUrl, uniqueId: u.uniqueId } as IUser)
);

export const selector: ISelector<UserState, IUser> = {
  name: (state) => state.name,
  email: (state) => state.email,
  avatarUrl: (state) => state.avatarUrl,
  uniqueId: (state) => state.uniqueId,
};

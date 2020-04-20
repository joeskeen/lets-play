import { IUser } from './user';
import { createReducer, on, createSelector } from '@ngrx/store';
import { updateUser } from './user.actions';
import { ISelector } from '../redux/selector';
import { v4 as uuid } from 'uuid';

export const EMPTY_AVATAR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII';

export interface UserState {
  user: IUser;
}

export const initialState: UserState = {
  user: {
    name: '',
    email: '',
    uniqueId: uuid(),
    avatarUrl: EMPTY_AVATAR,
  },
};

export const UserReducer = createReducer(
  initialState,
  on(updateUser, (state, action) => ({ ...state, user: action.user }))
);

export const getUser = (state: UserState) => state.user;
export const getPublicUser = createSelector(
  getUser,
  (u) =>
    ({ name: u.name, avatarUrl: u.avatarUrl, uniqueId: u.uniqueId } as IUser)
);

export const selector: ISelector<UserState, IUser> = {
  name: (state) => state.user.name,
  email: (state) => state.user.email,
  avatarUrl: (state) => state.user.avatarUrl,
  uniqueId: (state) => state.user.uniqueId,
};

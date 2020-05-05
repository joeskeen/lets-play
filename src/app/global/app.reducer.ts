import { createReducer, on } from '@ngrx/store';
import { UserState } from '../user/user.reducer';
import { GroupState } from '../group/group.reducer';
import {
  updateGroup,
  resetGroupUsers,
  addUser,
  removeUser,
} from '../group/group.actions';
import { updateUserIsSupremeLeader } from './app.actions';

export interface AppState {
  user?: UserState;
  group?: GroupState;
  global?: GlobalState;
}

export interface GlobalState {
  isUserSupremeLeader: boolean;
}

export const initialState: GlobalState = { isUserSupremeLeader: false };

export const appReducer = createReducer(
  initialState,
  on(updateUserIsSupremeLeader, (state, action) => ({
    ...state,
    isUserSupremeLeader: action.isUserSupremeLeader
  }))
);

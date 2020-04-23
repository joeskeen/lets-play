import { createReducer } from '@ngrx/store';
import { UserState } from '../user/user.reducer';
import { GroupState } from '../group/group.reducer';

export interface AppState {
  user?: UserState;
  group?: GroupState;
}

export const initialState: AppState = {};

export const AppReducer = createReducer(initialState);

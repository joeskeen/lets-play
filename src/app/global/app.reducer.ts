import { createReducer } from '@ngrx/store';
import { UserState } from '../user/user.reducer';

export interface AppState {
  user?: UserState;
}

export const initialState: AppState = {};

export const AppReducer = createReducer(initialState);

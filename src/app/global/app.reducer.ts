import { createReducer } from '@ngrx/store';
import {
  UserState,
  initialState as userInitialState,
} from '../user/user.reducer';

// tslint:disable-next-line: no-empty-interface
export interface AppState extends UserState {}

export const initialState: AppState = { ...userInitialState };

export const AppReducer = createReducer(initialState);

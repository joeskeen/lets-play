import { IGroup } from './group';
import { createReducer, on } from '@ngrx/store';
import * as actions from './group.actions';
import { ISelector } from '../redux/selector';
import { AppState } from '../global/app.reducer';

export type GroupState = IGroup & { editing?: boolean; isNew?: boolean; };

export const initialState: GroupState = {
  groupName: '',
  supremeLeader: null,
  users: [],
  governmentType: 'semi-direct democracy',
  activeInitiatives: [],
};

export const GroupReducer = createReducer(
  initialState,
  on(actions.requestCreateGroup, state => ({
    ...state,
    editing: true,
    isNew: true
  })),
  on(actions.requestEditGroup, state => ({
    ...state,
    editing: true,
    isNew: false
  })),
  on(actions.requestCancelEditGroup, state => ({
    ...state,
    users: state.isNew ? [] : state.users,
    editing: false,
    isNew: undefined,
  })),
  on(actions.addUser, (state, action) => ({
    ...state,
    users: [
      ...state.users.filter((u) => u.uniqueId !== action.user.uniqueId),
      action.user,
    ],
  })),
  on(actions.resetGroupUsers, (state, action) => ({
    ...state,
    users: [action.initialUser],
    supremeLeader: action.initialUser,
  })),
  on(actions.createInitiative, (state, action) => ({
    ...state,
    activeInitiatives: [
      ...state.activeInitiatives.filter(
        (i) => i.uniqueId !== action.initiative.uniqueId
      ),
      { ...action.initiative, champion: action.champion },
    ],
  })),
  on(actions.installNewSupremeLeader, (state, action) => ({
    ...state,
    supremeLeader: action.newSupremeLeader,
  })),
  on(actions.removeUser, (state, action) => ({
    ...state,
    users: state.users.filter((u) => u.uniqueId !== action.user.uniqueId),
  })),
  on(actions.supportInitiative, (state, action) => ({
    ...state,
    activeInitiatives: [
      ...state.activeInitiatives.map((i) =>
        i.uniqueId === action.initiative.uniqueId
          ? {
              ...i,
              supporters: [
                ...i.supporters.filter(
                  (u) => u.uniqueId !== action.supporter.uniqueId
                ),
                action.supporter,
              ],
            }
          : i
      ),
    ],
  })),
  on(actions.updateInitiative, (state, action) => ({
    ...state,
    activeInitiatives: state.activeInitiatives.map((i) =>
      i.uniqueId === action.initiative.uniqueId
        ? {
            ...i,
            ...action.initiative,
          }
        : i
    ),
  })),
  on(actions.updateGroup, (state, action) => ({
    ...state,
    ...action.group,
    editing: false,
    isNew: undefined
  })),
  on(actions.updateGroupUser, (state, action) => ({
    ...state,
    supremeLeader:
      state.supremeLeader &&
      state.supremeLeader.uniqueId === action.user.uniqueId
        ? { ...state.supremeLeader, ...action.user }
        : state.supremeLeader,
    users: state.users.map((u) =>
      u.uniqueId === action.user.uniqueId ? { ...u, ...action.user } : u
    ),
    activeInitiatives: state.activeInitiatives.map((i) => ({
      ...i,
      champion:
        i.champion.uniqueId === action.user.uniqueId
          ? { ...i.champion, ...action.user }
          : i.champion,
      supporters: i.supporters.map((u) =>
        u.uniqueId === action.user.uniqueId ? { ...u, ...action.user } : u
      ),
    })),
  })),
  on(actions.withdrawInitiative, (state, action) => ({
    ...state,
    activeInitiatives: state.activeInitiatives.filter(
      (i) => i.initiativeType !== action.initiative.uniqueId
    ),
  }))
);

export const getGroup = (state: AppState) => state.group;

export const selector: ISelector<GroupState, IGroup> = {
  activeInitiatives: (s) => s.activeInitiatives,
  governmentType: (s) => s.governmentType,
  groupName: (s) => s.groupName,
  supremeLeader: (s) => s.supremeLeader,
  users: (s) => s.users,
};

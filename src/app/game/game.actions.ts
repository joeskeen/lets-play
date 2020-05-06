import { createAction, props } from '@ngrx/store';
import { Steps, GameState, IResponse } from './game.state';
import { IUser } from '../user/user';

const gameActionType = (t: string) => `game:${t}`;

export const startGame = createAction(
  gameActionType('startGame'),
  props<{ players: IUser[]; prompts: string[] }>()
);

export const updateGame = createAction(
  gameActionType('updateGame'),
  props<{ game: Partial<GameState> }>()
);

export const startGuessing = createAction(gameActionType('startGuessing'));

export const startUserTurn = createAction(
  gameActionType('startUserTurn'),
  props<{ user: IUser }>()
);

export const requestNewGame = createAction(gameActionType('requestNewGame'));

export const nextPlayer = createAction(gameActionType('nextPlayer'));

export const updateStep = createAction(
  gameActionType('updateStep'),
  props<{ newStep: Steps }>()
);

export const addResponse = createAction(
  gameActionType('addResponse'),
  props<{ response: IResponse }>()
);

export const makeGuess = createAction(
  gameActionType('makeGuess'),
  props<{ guessingUser: IUser; response: IResponse; guessedUser: IUser }>()
);

export const newRound = createAction(gameActionType('newRound'));
export const endRound = createAction(gameActionType('endRound'));

export const scorePoint = createAction(
  gameActionType('scorePoint'),
  props<{ playerId: string }>()
);

export const revealResponse = createAction(
  gameActionType('revealResponse'),
  props<{ response: IResponse }>()
);

export const playerOut = createAction(
  gameActionType('playerOut'),
  props<{ user: IUser }>()
);

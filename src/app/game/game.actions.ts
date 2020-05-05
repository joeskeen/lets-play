import { createAction, props } from '@ngrx/store';
import { Steps, GameState, IResponse } from './game.state';

const gameActionType = (t: string) => `game:${t}`;

export const updateGame = createAction(
  gameActionType('updateGame'),
  props<{ game: GameState }>()
);

export const updateStep = createAction(
  gameActionType('updateStep'),
  props<{ newStep: Steps }>()
);

export const addResponse = createAction(
  gameActionType('addResponse'),
  props<{ response: IResponse }>()
);

export const newRound = createAction(gameActionType('newRound'));

export const scorePoint = createAction(
  gameActionType('scorePoint'),
  props<{ playerId: string }>()
);

export const revealResponse = createAction(
  gameActionType('revealResponse'),
  props<{ response: IResponse }>()
);

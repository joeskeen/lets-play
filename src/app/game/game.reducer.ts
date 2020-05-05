import { createReducer, on } from '@ngrx/store';
import { IUser } from '../user/user';
import {
  newRound,
  revealResponse,
  scorePoint,
  addResponse,
  updateStep,
  updateGame,
} from './game.actions';
import { GameState } from './game.state';

export const initialState: GameState = {
  players: [],
  prompts: [],
  step: 'NOT_STARTED',
  responses: [],
  currentPrompt: undefined,
};

export const GameReducer = createReducer(
  initialState,
  on(
    newRound,
    (state, action): GameState => {
      if (!state.prompts.length) {
        return { ...state, currentPrompt: null, step: 'GAME_OVER' };
      }
      const nextPromptIndex = Math.floor(Math.random() * state.prompts.length);
      return {
        ...state,
        currentPrompt: state.prompts[nextPromptIndex],
        prompts: state.prompts.filter((_, i) => i !== nextPromptIndex),
        step: 'WAITING_FOR_RESPONSES',
      };
    }
  ),
  on(
    revealResponse,
    (state, action): GameState => ({
      ...state,
      responses: state.responses.map((r) =>
        r.user.uniqueId === action.response.user.uniqueId
          ? { ...r, revealed: true }
          : r
      ),
    })
  ),
  on(
    scorePoint,
    (state, action): GameState => ({
      ...state,
      players: state.players.map((p) =>
        p.user.uniqueId === action.playerId ? { ...p, score: p.score + 1 } : p
      ),
    })
  ),
  on(
    addResponse,
    (state, action): GameState => ({
      ...state,
      responses: [
        ...state.responses.filter(
          (r) => r.user.uniqueId !== action.response.user.uniqueId
        ),
        action.response,
      ],
    })
  ),
  on(
    updateStep,
    (state, action): GameState => ({
      ...state,
      step: action.newStep,
    })
  ),
  on(
    updateGame,
    (state, action): GameState => ({
      ...state,
      ...action.game,
    })
  )
);

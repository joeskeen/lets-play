import { createReducer, on } from '@ngrx/store';
import {
  newRound,
  revealResponse,
  scorePoint,
  addResponse,
  updateStep,
  updateGame,
  startGame,
  startGuessing,
  nextPlayer,
  playerOut,
} from './game.actions';
import { GameState, gameFeatureKey } from './game.state';
import { AppState } from '../global/app.reducer';
import shuffle from 'fast-shuffle';

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
    startGame,
    (state, action): GameState => ({
      ...state,
      players: action.players.map((p) => ({
        user: p,
        score: 0,
        guessed: false,
      })),
      prompts: shuffle(action.prompts),
    })
  ),
  on(
    newRound,
    (state): GameState => {
      if (!state.prompts.length) {
        return { ...state, currentPrompt: null, step: 'GAME_OVER' };
      }
      return {
        ...state,
        currentPrompt: state.prompts[0],
        prompts: state.prompts.slice(1),
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
  ),
  on(
    startGuessing,
    (state): GameState => {
      const firstPlayer = shuffle(state.players)[0];
      return {
        ...state,
        currentTurn: firstPlayer.user,
        step: 'WAITING_FOR_GUESS',
      };
    }
  ),
  on(
    nextPlayer,
    (state): GameState => {
      const currentPlayerIndex = state.players.indexOf(
        state.players.find(
          (p) => p.user.uniqueId === state.currentTurn.uniqueId
        )
      );
      const playOrder = [
        ...state.players.slice((currentPlayerIndex + 1) % state.players.length),
        ...state.players.slice(0, currentPlayerIndex),
        state.players[currentPlayerIndex],
      ];
      const player = playOrder.find((p) => !p.guessed);
      return {
        ...state,
        currentTurn: player.user,
      };
    }
  ),
  on(playerOut, (state, action) => ({
    ...state,
    players: state.players.map((p) =>
      p.user.uniqueId === action.user.uniqueId ? { ...p, guessed: true } : p
    ),
  }))
);

export const getGame = (state: AppState): GameState => state[gameFeatureKey];

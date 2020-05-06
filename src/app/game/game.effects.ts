import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  startGame,
  newRound,
  addResponse,
  startGuessing,
  makeGuess,
  revealResponse,
  scorePoint,
  nextPlayer,
  playerOut,
  endRound,
  requestNewGame,
  updateStep,
  updateGame,
} from './game.actions';
import {
  map,
  withLatestFrom,
  filter,
  mergeMap,
  switchMap,
} from 'rxjs/operators';
import { Store, Action } from '@ngrx/store';
import { ModalService } from '@healthcatalyst/cashmere';
import { NewGameModal } from './new-game/new-game.modal';
import { AppState } from '../global/app.reducer';
import { getGame } from './game.reducer';
import { requestBroadcastAction } from '../global/app.actions';
import shuffle from 'fast-shuffle';

@Injectable()
export class GameEffects {
  constructor(
    private actions: Actions,
    private state: Store<AppState>,
    private modalService: ModalService
  ) {}

  requestNewGame$ = createEffect(
    () =>
      this.actions.pipe(
        ofType(requestNewGame),
        switchMap(() => this.modalService.open(NewGameModal).result)
      ),
    { dispatch: false }
  );

  broadcastActions$ = createEffect(() =>
    this.actions.pipe(
      ofType(addResponse, makeGuess),
      withLatestFrom(this.state),
      filter(([_, s]) => !s.global.isUserSupremeLeader),
      map(([a]) => requestBroadcastAction({ action: a }))
    )
  );

  newRound$ = createEffect(() =>
    this.actions.pipe(
      ofType(newRound),
      withLatestFrom(this.state),
      filter(([_, s]) => s.global.isUserSupremeLeader),
      map(([_, s]) => getGame(s)),
      map((state) => {
        if (!state.prompts.length) {
          return updateStep({ newStep: 'GAME_OVER' });
        }
        const nextPromptIndex = Math.floor(
          Math.random() * state.prompts.length
        );
        return updateGame({
          game: {
            currentPrompt: state.prompts[nextPromptIndex],
            prompts: state.prompts.filter((_, i) => i !== nextPromptIndex),
            players: state.players.map(p => ({ ...p, guessed: false })),
            responses: [],
            step: 'WAITING_FOR_RESPONSES',
          },
        });
      })
    )
  );

  gameStarted$ = createEffect(() =>
    this.actions.pipe(
      ofType(startGame),
      map(() => newRound())
    )
  );

  responseAdded$ = createEffect(() =>
    this.actions.pipe(
      ofType(addResponse),
      withLatestFrom(this.state),
      filter(([_, s]) => s.global.isUserSupremeLeader),
      map(([a, s]) => ({ action: a, state: getGame(s) })),
      filter(({ state }) => state.responses.length === state.players.length),
      mergeMap(({ state }) => [
        updateGame({
          game: {
            prompts: shuffle(state.prompts),
          },
        }),
        startGuessing({ firstPlayer: shuffle(state.players)[0].user }),
      ])
    )
  );

  guessMade$ = createEffect(() =>
    this.actions.pipe(
      ofType(makeGuess),
      withLatestFrom(this.state),
      filter(([_, s]) => s.global.isUserSupremeLeader),
      map(([a, s]) => ({ action: a, state: getGame(s) })),
      filter(
        ({ action, state }) =>
          state.currentTurn.uniqueId === action.guessingUser.uniqueId &&
          action.guessingUser.uniqueId !== action.guessedUser.uniqueId
      ),
      mergeMap(({ action, state }) => {
        const correctGuess = state.responses.find(
          (r) =>
            r.response === action.response.response &&
            r.user.uniqueId === action.guessedUser.uniqueId &&
            !r.revealed
        );
        if (correctGuess) {
          const nextActions: Action[] = [
            revealResponse({ response: action.response }),
            scorePoint({ playerId: action.guessingUser.uniqueId }),
            playerOut({ user: action.guessedUser }),
          ];
          const remainingResponses = state.responses.filter(
            (r) =>
              r !== correctGuess &&
              !r.revealed &&
              r.user.uniqueId !== action.guessingUser.uniqueId
          );
          console.log('remaining responses', remainingResponses);
          if (!remainingResponses.length) {
            const playerResponse = state.responses.find(
              (r) => r.user.uniqueId === action.guessingUser.uniqueId
            );
            nextActions.push(revealResponse({ response: playerResponse }));
            nextActions.push(endRound());
          }
          return nextActions;
        } else {
          return [nextPlayer()];
        }
      })
    )
  );
}

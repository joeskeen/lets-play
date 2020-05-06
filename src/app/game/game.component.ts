import { Component } from '@angular/core';
import { GameState, IResponse } from './game.state';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { getGame } from './game.reducer';
import { AppState } from '../global/app.reducer';
import { IUser } from '../user/user';
import { getUser } from '../user/user.reducer';
import { FormControl, Validators } from '@angular/forms';
import {
  addResponse,
  newRound,
  makeGuess,
  requestNewGame,
} from './game.actions';

@Component({
  selector: 'app-game',
  templateUrl: 'game.component.html',
  styleUrls: ['game.component.scss'],
})
export class GameComponent {
  readonly game$: Observable<GameState>;
  readonly user$: Observable<IUser>;
  readonly isSupremeLeader$: Observable<boolean>;
  readonly responseControl = new FormControl('', [Validators.required]);

  constructor(private store: Store<AppState>) {
    this.game$ = store.select(getGame);
    this.user$ = store.select(getUser);
    this.isSupremeLeader$ = store.select((s) => s.global?.isUserSupremeLeader);
  }

  playerHasEnteredResponse(game: GameState, user: IUser) {
    return !!game.responses.find((r) => r.user.uniqueId === user.uniqueId);
  }

  submitResponse(user: IUser) {
    const response = (this.responseControl.value as string)
      .toLowerCase()
      .replace(/[^a-z0-9'_]/g, ' ')
      .replace(/\s+/, ' ')
      .trim();
    this.store.dispatch(
      addResponse({
        response: {
          user,
          response,
          revealed: false,
        } as IResponse,
      })
    );
  }

  nextRound() {
    this.store.dispatch(newRound());
  }

  newGame() {
    this.store.dispatch(requestNewGame());
  }

  makeGuess(guessingUser: IUser, guessedUser: IUser, response: IResponse) {
    this.store.dispatch(
      makeGuess({
        guessingUser,
        guessedUser,
        response,
      })
    );
  }
}

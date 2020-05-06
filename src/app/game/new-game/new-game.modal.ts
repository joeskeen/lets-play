import { Component, OnDestroy } from '@angular/core';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from 'src/app/global/app.reducer';
import { startGame } from '../game.actions';
import { IUser } from 'src/app/user/user';
import { Subject } from 'rxjs';
import { getGroup, selector } from 'src/app/group/group.reducer';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import shuffle from 'fast-shuffle';

@Component({
  templateUrl: 'new-game.modal.html',
  styleUrls: ['new-game.modal.scss'],
})
export class NewGameModal implements OnDestroy {
  private users: IUser[];
  readonly promptsControl = new FormControl('', [Validators.required]);
  private readonly destroyed = new Subject();

  constructor(public activeModal: ActiveModal, private store: Store<AppState>) {
    this.store
      .pipe(
        takeUntil(this.destroyed),
        map(getGroup),
        map(selector.users),
        distinctUntilChanged()
      )
      .subscribe((users) => (this.users = users));
  }

  start() {
    const input: string = this.promptsControl.value;
    const prompts = input
      .split(/\r?\n/g)
      .map((l) =>
        l
          .replace(/\s+/, ' ')
          .trim()
      ).filter(l => !!l);
    this.store.dispatch(startGame({ players: this.users, prompts: shuffle(prompts) }));
    this.activeModal.close();
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import { Room } from './room';
import { GameView } from './ui/game';
import { JoinView } from './ui/join';
import { Landing } from './ui/landing';
import { Lobby } from './ui/lobby';

type View = 'landing' | 'join' | 'lobby' | 'game';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Landing, JoinView, Lobby, GameView],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly room = inject(Room);

  private readonly destroyRef = inject(DestroyRef);

  readonly view = computed<View>(() => {
    if (this.room.phase() === 'idle') return 'landing';
    if (this.room.phase() === 'joining') return 'join';
    if (!this.room.me()) return 'join';
    return this.room.game().step === 'lobby' ? 'lobby' : 'game';
  });

  constructor() {
    void this.room.joinFromUrl();

    // Pasting an invite into the address bar of an already-open tab is a
    // same-document navigation: no reload, so the constructor will not see the
    // new hash. React to it as long as we are not already in a room.
    const onHashChange = (): void => {
      if (this.room.phase() === 'idle') void this.room.joinFromUrl();
    };
    window.addEventListener('hashchange', onHashChange);
    this.destroyRef.onDestroy(() =>
      window.removeEventListener('hashchange', onHashChange),
    );
  }
}

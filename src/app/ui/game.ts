import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { hasResponded, waitingOn } from '../game/model';
import type { Response } from '../game/model';
import { Room } from '../room';
import { Avatar } from './avatar';
import { Scoreboard } from './scoreboard';

@Component({
  selector: 'app-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Scoreboard],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameView {
  readonly room = inject(Room);

  readonly game = this.room.game;
  readonly meId = computed(() => this.room.identity().id);
  readonly hostId = computed(() => this.room.state().room.hostId);
  readonly responded = computed(() => hasResponded(this.game(), this.meId()));
  readonly waiting = computed(() => waitingOn(this.game()));
  readonly draft = signal('');
  readonly picked = signal<string | null>(null);

  readonly turnName = computed(() => {
    const game = this.game();
    return game.players.find((player) => player.id === game.turnId)?.name ?? '';
  });

  readonly stepLabel = computed(() => {
    switch (this.game().step) {
      case 'writing':
        return 'Write';
      case 'guessing':
        return 'Guess';
      case 'round-end':
        return 'Round over';
      case 'game-over':
        return 'Game over';
      default:
        return 'Lobby';
    }
  });

  readonly selectedResponse = computed<Response | null>(() => {
    const id = this.picked();
    if (!id) return null;
    return this.game().responses.find((response) => response.id === id) ?? null;
  });

  readonly guessable = computed(() =>
    this.game().players.filter(
      (player) => player.id !== this.meId() && !player.guessed,
    ),
  );

  answered(playerId: string): boolean {
    return hasResponded(this.game(), playerId);
  }

  authorName(playerId: string): string {
    return (
      this.game().players.find((player) => player.id === playerId)?.name ??
      'Unknown'
    );
  }

  onDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.room.respond(text);
    this.draft.set('');
  }

  pick(responseId: string): void {
    if (!this.room.isMyTurn()) return;
    this.picked.set(responseId);
  }

  clearPick(): void {
    this.picked.set(null);
  }

  guess(guessedId: string): void {
    const responseId = this.picked();
    if (!responseId) return;
    this.room.guess(responseId, guessedId);
    this.picked.set(null);
  }

  nextRound(): void {
    this.room.nextRound();
  }

  playAgain(): void {
    this.room.playAgain();
  }

  leave(): void {
    this.room.leave();
  }
}

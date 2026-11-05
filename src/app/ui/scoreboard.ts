import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Player } from '../game/model';
import { Avatar } from './avatar';

@Component({
  selector: 'app-scoreboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    <ol class="list scoreboard">
      @for (player of ranked(); track player.id; let index = $index) {
        <li class="list__item" [class.list__item--me]="player.id === meId()">
          <span class="scoreboard__rank">{{ index + 1 }}</span>
          <app-avatar [id]="player.id" [name]="player.name" size="sm" />
          <span class="list__grow list__name">{{ player.name }}</span>
          @if (player.id === hostId()) {
            <span class="badge badge--host">host</span>
          }
          <strong class="scoreboard__score">{{ player.score }}</strong>
        </li>
      }
    </ol>
  `,
  styles: `
    .scoreboard {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .scoreboard__rank {
      width: 1.25rem;
      text-align: center;
      color: var(--faint);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .scoreboard__score {
      min-width: 1.5rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class Scoreboard {
  readonly players = input.required<Player[]>();
  readonly meId = input('');
  readonly hostId = input('');

  readonly ranked = computed(() =>
    this.players()
      .slice()
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  );
}

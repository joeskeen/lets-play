import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avatarFor } from '../core/identity';

/** A deterministic identicon. No image is ever sent over the wire. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="avatar"
      [class.avatar--sm]="size() === 'sm'"
      [class.avatar--lg]="size() === 'lg'"
      [src]="src()"
      [alt]="name() || 'Player'"
      [title]="name()"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
})
export class Avatar {
  readonly id = input.required<string>();
  readonly name = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly src = computed(() => avatarFor(this.id()));
}

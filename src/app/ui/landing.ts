import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { sanitizeName } from '../core/identity';
import { Room } from '../room';
import { Avatar } from './avatar';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  readonly room = inject(Room);

  readonly name = signal(this.room.identity().name);
  readonly joinText = signal('');
  readonly joining = signal(false);

  host(): void {
    this.commitName();
    this.room.host();
  }

  async join(): Promise<void> {
    this.commitName();
    this.joining.set(true);
    try {
      await this.room.join(this.joinText());
    } catch {
      // Room surfaces the message; landing just stops spinning.
    } finally {
      this.joining.set(false);
    }
  }

  onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onJoinText(event: Event): void {
    this.joinText.set((event.target as HTMLTextAreaElement).value);
  }

  commitName(): void {
    const name = sanitizeName(this.name());
    if (!name) {
      this.name.set(this.room.identity().name);
      return;
    }
    this.name.set(name);
    this.room.setName(name);
  }
}

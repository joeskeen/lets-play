import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Room } from '../room';

@Component({
  selector: 'app-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './join.html',
  styleUrl: './join.scss',
})
export class JoinView {
  readonly room = inject(Room);
  readonly copied = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  copy(): void {
    const reply = this.room.replyCode();
    if (!reply) return;
    void this.copyText(reply);
  }

  cancel(): void {
    this.room.leave();
  }

  private async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard can be blocked; the textarea is selectable as a fallback.
    }
  }
}

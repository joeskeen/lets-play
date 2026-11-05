import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { inviteUrl } from '../core/invite';
import { DEFAULT_PROMPTS, parsePrompts, promptsToText } from '../game/prompts';
import { Room } from '../room';
import { Avatar } from './avatar';
import { Qr } from './qr';

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Qr],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class Lobby {
  readonly room = inject(Room);

  readonly prompts = signal(promptsToText(DEFAULT_PROMPTS));
  readonly reply = signal('');
  readonly copied = signal(false);
  readonly canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  readonly memberCount = computed(() => this.room.memberViews().length);
  readonly canStart = computed(() => this.memberCount() >= 2);
  readonly hostName = computed(() => {
    const room = this.room.state().room;
    return (
      room.members.find((member) => member.id === room.hostId)?.name ??
      'the host'
    );
  });
  readonly inviteLink = computed(() => {
    const code = this.room.inviteCode();
    return code ? inviteUrl(code) : '';
  });

  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  async createInvite(): Promise<void> {
    try {
      await this.room.createInvite();
    } catch {
      // Room already surfaced the error.
    }
  }

  async connect(): Promise<void> {
    try {
      await this.room.acceptReply(this.reply());
      this.reply.set('');
    } catch {
      // Room already surfaced the error.
    }
  }

  start(): void {
    this.room.startGame(parsePrompts(this.prompts()));
  }

  rename(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.trim()) {
      this.room.renameRoom(input.value);
    } else {
      input.value = this.room.state().room.name;
    }
  }

  onPrompts(event: Event): void {
    this.prompts.set((event.target as HTMLTextAreaElement).value);
  }

  onReply(event: Event): void {
    this.reply.set((event.target as HTMLTextAreaElement).value);
  }

  async copyInvite(): Promise<void> {
    const link = this.inviteLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.copied.set(true);
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // The textarea is selectable as a fallback.
    }
  }

  async shareInvite(): Promise<void> {
    const link = this.inviteLink();
    if (!link) return;
    try {
      await navigator.share({
        title: 'Let’s Play',
        text: 'Join my game',
        url: link,
      });
    } catch {
      // Sharing was dismissed or unsupported.
    }
  }

  leave(): void {
    this.room.leave();
  }
}

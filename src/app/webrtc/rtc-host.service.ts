import { Injectable } from '@angular/core';
import { ModalService } from '@healthcatalyst/cashmere';
import { CreateSessionModal } from './create-session.modal';
import { first } from 'rxjs/operators';
import { RtcClient } from './rtc-client';

@Injectable({ providedIn: 'root' })
export class RtcHostService {
  clients: RtcClient[] = [];

  constructor(private modalService: ModalService) {}

  async addParticipant() {
    const participantClient: RtcClient = await this.modalService
      .open(CreateSessionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
    this.clients.push(participantClient);
  }

  async broadcast(message: any) {
    this.clients.forEach((c) => {
      c.sendMessage(message);
    });
  }

  async removeParticipant(client: RtcClient) {
    this.clients = this.clients.filter((c) => c !== client);
  }
}

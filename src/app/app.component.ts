import { Component } from '@angular/core';
import { RtcService, RtcClient } from './webrtc/rtc.service';
import { ModalService } from '@healthcatalyst/cashmere';
import { CreateSessionModal } from './webrtc/create-session.modal';
import { JoinSessionModal } from './webrtc/join-session.modal';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'p2p-game';
  client: RtcClient;

  constructor(private modalService: ModalService) {}

  async newSession() {
    this.client = await this.modalService
      .open(CreateSessionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
  }

  async joinSession() {
    this.client = await this.modalService
      .open(JoinSessionModal, { size: 'lg' })
      .result.pipe(first())
      .toPromise();
  }
}

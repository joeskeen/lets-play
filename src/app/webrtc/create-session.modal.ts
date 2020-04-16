import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ClipboardService } from 'ngx-clipboard';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Create a new session</hc-modal-header>
      <hc-modal-body>
        <div class="side-by-side">
          <div>
            <h3>1. Invite someone to join your session</h3>
            <p>
              Copy the message below and send it to the person you want to join.
              You can use a service like
              <a href="https://hastebin.com" target="_blank">hastebin</a>
              to turn this message into a short link. Tell them to send back
              their join message after pasting yours into the Join Session
              window.
            </p>
            <button hc-button (click)="copyMessage()">
              <hc-icon fontSet="fa" fontIcon="fa-copy" hcIconSm></hc-icon>
              Copy Message
            </button>
            <pre><code>{{ this.hostMessage.value }}</code></pre>
          </div>
          <div>
            <h3>2. Receive their connection</h3>
            <p>
              Paste their response message below to complete the connection:
            </p>
            <textarea [formControl]="peerMessage"></textarea>
          </div>
        </div>
      </hc-modal-body>
      <hc-modal-footer>
        <button hc-button buttonStyle="secondary" (click)="cancel()">
          Cancel
        </button>
      </hc-modal-footer>
    </hc-modal>
  `,
  styles: [
    `
      .side-by-side {
        display: flex;
        flex-direction: row;
        align-items: stretch;
      }

      .side-by-side > div {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        margin: 5px;
      }

      textarea,
      pre {
        flex: 1;
      }

      button hc-icon {
        margin-right: 10px;
      }
    `,
  ],
})
export class CreateSessionModal implements OnInit, OnDestroy {
  readonly hostMessage = new FormControl('');
  readonly peerMessage = new FormControl('', [Validators.required]);
  private readonly destroyed = new Subject<void>();

  constructor(
    private rtcService: RtcService,
    private activeModal: ActiveModal,
    private toasterService: HcToasterService,
    private clipboardService: ClipboardService
  ) {}

  async ngOnInit() {
    const client = await this.rtcService.create((message) => {
      this.hostMessage.patchValue(message);
      return this.peerMessage.valueChanges
        .pipe(
          takeUntil(this.destroyed),
          map((v) => (v || '').trim()),
          filter((v) => !!v),
          first()
        )
        .toPromise();
    });
    this.activeModal.close(client);
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  copyMessage() {
    this.clipboardService.copy(this.hostMessage.value);
    this.toasterService.addToast({
      type: 'success',
      header: 'Success',
      body: 'Successfully copied invite message to clipboard',
    });
  }

  cancel() {
    this.activeModal.dismiss();
  }
}

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ClipboardService } from 'ngx-clipboard';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Join an existing session</hc-modal-header>
      <hc-modal-body>
        <div class="side-by-side">
          <div>
            <h3>1. Receive their connection</h3>
            <p>
              Paste the host's invite message below:
            </p>
            <textarea [formControl]="hostMessage"></textarea>
          </div>
          <div>
            <h3>2. Send them your connection</h3>
            <p>
              Copy the message below and send it to the person that invited you.
              You can use a service like
              <a href="https://hastebin.com" target="_blank">hastebin</a>
              to turn this message into a short link.
            </p>
            <button hc-button (click)="copyMessage()">
              <hc-icon fontSet="fa" fontIcon="fa-copy" hcIconSm></hc-icon>
              Copy Message
            </button>
            <pre><code>{{ this.peerMessage.value }}</code></pre>
          </div>
        </div>
      </hc-modal-body>
      <hc-modal-footer>
        <button hc-button buttonStyle="secondary" (click)="cancel()">
          Cancel
        </button>
        <button
          hc-button
          (click)="done.next()"
          [disabled]="hostMessage.invalid"
        >
          Done
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
      }

      textarea,
      pre {
        flex: 1;
      }
    `,
  ],
})
export class JoinSessionModal implements OnInit, AfterViewInit {
  readonly hostMessage = new FormControl('', [Validators.required]);
  readonly peerMessage = new FormControl('', [Validators.required]);
  readonly done = new Subject<void>();

  constructor(
    private rtcService: RtcService,
    private activeModal: ActiveModal,
    private clipboardService: ClipboardService,
    private toasterService: HcToasterService
  ) {}
  ngOnInit() {}
  async ngAfterViewInit() {
    const hostMessage = await this.hostMessage.valueChanges
      .pipe(
        takeUntil(this.done),
        map((v) => (v || '').trim()),
        filter((v) => !!v),
        first()
      )
      .toPromise();
    const client = await this.rtcService.join(hostMessage, (message) => {
      this.peerMessage.patchValue(message);
      return this.done.pipe(first()).toPromise();
    });
    this.activeModal.close(client);
  }

  copyMessage() {
    this.clipboardService.copy(this.peerMessage.value);
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

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ClipboardService } from 'ngx-clipboard';
import { IUser } from '../models/user';
import { EncodingService } from './encoding.service';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Join an existing session</hc-modal-header>
      <hc-modal-body>
        <div>
          <div>
            <h3>1. Receive their connection</h3>
            <hc-form-field>
              <hc-label>Paste the host's invite message below:</hc-label>
              <textarea hcInput [formControl]="hostMessage"></textarea>
            </hc-form-field>
          </div>
          <div>
            <h3>2. Send them your connection</h3>
            <p>
              Copy the message below and send it to the person that invited you.
              You can use a service like
              <a href="https://hastebin.com" target="_blank">hastebin</a>
              to turn this message into a short link.
            </p>
            <div class="centered">
              <button
                hc-button
                (click)="copyMessage()"
                [disabled]="hostMessage.invalid"
              >
                <hc-icon
                  fontSet="fa"
                  fontIcon="fa-copy"
                  hcIconSm
                  class="icon-left"
                ></hc-icon>
                Copy RSVP Message
              </button>
            </div>
            <hc-accordion>
              <hc-accordion-toolbar>Show RSVP Message</hc-accordion-toolbar>
              <pre><code>{{ this.peerMessage.value }}</code></pre>
            </hc-accordion>
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
      }

      textarea,
      pre {
        flex: 1;
      }

      .centered {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 15px;
      }

      button .icon-left {
        margin-right: 5px;
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
    private activeModal: ActiveModal<IJoinSessionModalData>,
    private clipboardService: ClipboardService,
    private toasterService: HcToasterService,
    private encodingService: EncodingService
  ) {}
  ngOnInit() {}
  async ngAfterViewInit() {
    try {
      const hostMessage = await this.hostMessage.valueChanges
        .pipe(
          takeUntil(this.done),
          map((v) => (v || '').trim() as string),
          filter((v) => !!v),
          map((v) => this.encodingService.decode<RTCSessionDescriptionInit>(v)),
          first()
        )
        .toPromise();
      const client = await this.rtcService.join(
        hostMessage,
        this.activeModal.data.user,
        async (message) => {
          this.peerMessage.patchValue(this.encodingService.encode(message));
        }
      );
      this.activeModal.close(client);
    } catch (err) {
      this.toasterService.addToast({
        type: 'alert',
        header: 'Oops!',
        body: 'Something went wrong.  Press Cancel then try again.',
      });
    }
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

export interface IJoinSessionModalData {
  user: IUser;
}

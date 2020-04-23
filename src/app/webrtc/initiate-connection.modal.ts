import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActiveModal, HcToasterService } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ClipboardService } from 'ngx-clipboard';
import { IUser } from '../user/user';
import { EncodingService } from './encoding.service';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Add new player</hc-modal-header>
      <hc-modal-body>
        <div>
          <div>
            <h3>1. Invite someone to join your group</h3>
            <p>
              Copy the message below and send it to the person you want to join.
              You can use a service like
              <a href="https://hastebin.com" target="_blank">hastebin</a>
              to turn this message into a short link. Tell them to send back
              their join message after pasting yours into the Join Group window.
            </p>
            <div class="centered">
              <button hc-button (click)="copyMessage()">
                <hc-icon fontSet="fas" fontIcon="fa-copy" hcIconSm></hc-icon>
                Copy Invitation Message
              </button>
            </div>
            <hc-accordion>
              <hc-accordion-toolbar>
                View invitation message
              </hc-accordion-toolbar>
              <pre><code>{{ this.hostMessage.value }}</code></pre>
            </hc-accordion>
          </div>
          <div>
            <h3>2. Receive their connection</h3>
            <hc-form-field>
              <hc-label>
                Paste their response message below to complete the connection:
              </hc-label>
              <textarea hcInput [formControl]="peerMessage"></textarea>
            </hc-form-field>
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

      .centered {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 15px;
      }
    `,
  ],
})
export class InitiateConnectionModal implements OnInit, OnDestroy {
  readonly hostMessage = new FormControl('');
  readonly peerMessage = new FormControl('', [Validators.required]);
  private readonly destroyed = new Subject<void>();

  constructor(
    private rtcService: RtcService,
    private activeModal: ActiveModal<IInitiateConnectionData>,
    private toasterService: HcToasterService,
    private clipboardService: ClipboardService,
    private encodingService: EncodingService
  ) {}

  async ngOnInit() {
    try {
      const client = await this.rtcService.create(
        this.activeModal.data.user,
        (message) => {
          const invitation = `Join me online!\r\n
1. Go to ${window.location.href}
2. Click Join Group
3. Paste the following message in the text area:\r\n\r\n${this.encodingService.encode(
            message
          )}`;

          this.hostMessage.patchValue(invitation);
          return this.peerMessage.valueChanges
            .pipe(
              takeUntil(this.destroyed),
              map((v) => (v || '').trim()),
              filter((v) => !!v),
              map((v) => this.encodingService.decode(v)),
              first()
            )
            .toPromise();
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

export interface IInitiateConnectionData {
  user: IUser;
}

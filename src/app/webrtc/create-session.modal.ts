import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil } from 'rxjs/operators';
import { BehaviorSubject, Subject } from 'rxjs';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Create a new session</hc-modal-header>
      <hc-modal-body>
        <div class="side-by-side">
          <div>
            <pre><code>{{ this.hostMessage.value }}</code></pre>
          </div>
          <div>
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
      }

      textarea {
        flex: 1;
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
    private activeModal: ActiveModal
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

  cancel() {
    this.activeModal.dismiss();
  }
}

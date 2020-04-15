import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActiveModal } from '@healthcatalyst/cashmere';
import { RtcService } from './rtc.service';
import { FormControl, Validators } from '@angular/forms';
import { map, filter, first, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  template: `
    <hc-modal>
      <hc-modal-header>Join an existing session</hc-modal-header>
      <hc-modal-body>
        <div class="side-by-side">
          <div>
            <textarea [formControl]="hostMessage"></textarea>
          </div>
          <div>
            <pre>{{ this.peerMessage.value }}</pre>
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

      textarea {
        flex: 1;
      }
    `,
  ],
})
export class JoinSessionModal implements OnInit, OnDestroy, AfterViewInit {
  readonly hostMessage = new FormControl('', [Validators.required]);
  readonly peerMessage = new FormControl('', [Validators.required]);
  readonly done = new Subject<void>();
  private readonly destroyed = new Subject<void>();

  constructor(
    private rtcService: RtcService,
    private activeModal: ActiveModal
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

  ngOnDestroy() {
    // this.destroyed.next();
    // this.destroyed.complete();
  }

  cancel() {
    this.activeModal.dismiss();
  }
}

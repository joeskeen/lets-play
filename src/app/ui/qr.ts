import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import qrcode from 'qrcode-generator';

interface QrShape {
  size: number;
  path: string;
}

function build(value: string, level: 'L' | 'M'): QrShape | null {
  try {
    const qr = qrcode(0, level);
    qr.addData(value);
    qr.make();

    const count = qr.getModuleCount();
    const margin = 4;
    const size = count + margin * 2;
    const parts: string[] = [];

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!qr.isDark(row, col)) continue;
        parts.push(`M${col + margin} ${row + margin}h1v1h-1z`);
      }
    }

    return { size, path: parts.join('') };
  } catch {
    return null;
  }
}

/**
 * QR for the invite URL. Drawn as a single SVG path — no canvas, no image
 * upload, no external QR service.
 */
@Component({
  selector: 'app-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shape(); as qr) {
      <svg
        class="qr"
        [attr.viewBox]="'0 0 ' + qr.size + ' ' + qr.size"
        role="img"
        aria-label="QR code for the invite link"
        shape-rendering="crispEdges"
      >
        <rect [attr.width]="qr.size" [attr.height]="qr.size" fill="#ffffff" />
        <path [attr.d]="qr.path" fill="#0b0e1a" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class Qr {
  readonly value = input.required<string>();

  readonly shape = computed<QrShape | null>(() => {
    const value = this.value();
    if (!value) return null;
    // Invite URLs are long. Low error correction keeps the module count (and
    // therefore the physical size needed for a phone camera) down; the code is
    // displayed on a clean screen, not printed on a muddy poster.
    return build(value, 'L') ?? build(value, 'M');
  });
}

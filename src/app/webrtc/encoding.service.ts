import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EncodingService {
  encode<T>(message: T): string {
    try {
      const val = JSON.stringify(message);
      const encoded = btoa(val);
      return `----------BEGIN MESSAGE----------
${encoded.match(/.{1,33}/g).join('\n')}
-----------END MESSAGE-----------`;
    } catch (err) {
      throw new Error(`Could not encode message: ${err.message}`);
    }
  }

  decode<T>(encodedMessage: string): T {
    try {
      const content = /BEGIN MESSAGE-+([\s\S]+?)-+END MESSAGE/.exec(
        encodedMessage
      )[1];
      const encoded = (content || '').trim().replace(/\s*\r?\n\s*/g, '');
      const decoded = atob(encoded);
      return JSON.parse(decoded) as T;
    } catch (err) {
      throw new Error(`could not decode message: ${err.message}`);
    }
  }
}

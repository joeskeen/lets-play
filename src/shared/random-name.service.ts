import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProxyableService } from './proxyable-service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RandomNameService extends ProxyableService {
  constructor(private httpClient: HttpClient) {
    super(environment?.nameServer, environment?.corsProxy);
  }

  async getRandomName(): Promise<string> {
    try {
      const name = await this.httpClient
        .get(this.getUrl(), {
          observe: 'body',
          responseType: 'text',
        })
        .toPromise();
      return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z]+/g, '-');
    } catch (err) {
      throw new Error(
        `There was a problem with the random name server: ${err.message}`
      );
    }
  }
}

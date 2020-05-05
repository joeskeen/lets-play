import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProxyableService } from './proxyable-service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RandomNameService extends ProxyableService {
  constructor(private httpClient: HttpClient) {
    super(environment?.nameServer, environment?.corsProxy);
  }

  getRandomName(): Promise<string> {
    return this.httpClient
      .get(this.getUrl(), {
        observe: 'body',
        responseType: 'text',
      })
      .toPromise();
  }
}

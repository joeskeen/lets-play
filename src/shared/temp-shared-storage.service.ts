import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, timer, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ProxyableService } from './proxyable-service';

const defaultWatchInterval = 10 * 1000;

/**
 * see environment.ts for configuration instructions
 */
@Injectable({ providedIn: 'root' })
export class TempSharedStorageService extends ProxyableService {
  readonly watchInterval: number;

  constructor(private httpClient: HttpClient) {
    super(environment?.nameServer, environment?.corsProxy);
    this.watchInterval =
      environment?.tempSharedStorage?.watchInterval || defaultWatchInterval;
  }

  watch<T>(path: string, watchInterval?: number): Observable<T> {
    const url = this.getUrl(path);
    return timer(0, watchInterval || this.watchInterval).pipe(
      switchMap(() => this.httpClient.get(url)),
      catchError(() => of(null))
    );
  }

  async get<T>(path: string): Promise<T> {
    try {
      return await this.httpClient.get<T>(this.getUrl(path)).toPromise();
    } catch {
      return null;
    }
  }

  async set<T>(path: string, value: T): Promise<void> {
    await this.httpClient
      .post(
        this.getUrl(path),
        value,
        { responseType: 'text' }
      )
      .toPromise();
  }

  async delete(path: string): Promise<void> {
      await this.httpClient.delete(this.getUrl(path)).toPromise();
  }
}

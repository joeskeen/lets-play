import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';

@Injectable({ providedIn: 'root' })
export class LocalSettingsService {
  constructor(private storageMap: StorageMap) {}

  async get<T>(key: string): Promise<T> {
    return (await this.storageMap.get(key).toPromise()) as T;
  }

  set<T>(key: string, content: T): Promise<void> {
    return this.storageMap.set(key, content).toPromise();
  }

  delete(key: string): Promise<void> {
    return this.storageMap.delete(key).toPromise();
  }
}

import { Store } from '@ngrx/store';
import { Subject, Observable } from 'rxjs';

export function createFakeStore<T>(): FakeStore<T> {
  const actionSubject = new Subject<any>();
  const fake: any = new Subject<T>();
  fake.dispatch = (a: any) => actionSubject.next(a);
  fake.actions = actionSubject.asObservable();
  return fake;
}

export type FakeStore<T> = Store<T> & Subject<T> & { actions: Observable<any> };

import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export type FakeStore<T> = jasmine.SpyObj<Store<T>> & Subject<T>;

export function createFakeStore<T>(): FakeStore<T> {
  const subject = new Subject<T>();
  const spyObj = jasmine.createSpyObj<Store<T>>('fakeStore', [
    'dispatch',
    'select',
    'pipe',
  ]);
  spyObj.select.and.callFake((fn: any) => subject.pipe(map(fn)) as any);
  spyObj.pipe.and.callFake((...args: any[]) =>
    subject.pipe.apply(subject, args)
  );
  return { ...spyObj, ...subject, next: subject.next } as FakeStore<T>;
}

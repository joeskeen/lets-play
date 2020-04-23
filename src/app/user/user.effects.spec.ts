import { UserEffects } from './user.effects';
import { Actions } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Subject, of } from 'rxjs';
import { StorageMap } from '@ngx-pwa/local-storage';
import { UserState } from './user.reducer';
import { ModalService } from '@healthcatalyst/cashmere';
import { FakeStore, createFakeStore } from '../redux/store.fake';
import {
  requestLoadUser,
  requestEditUser,
  updateUser,
  UpdateUserAction,
  RequestEditUserAction,
} from './user.actions';
import { IUser } from './user';
import { fakeAsync, tick } from '@angular/core/testing';
import { UserSetupModal } from './user-setup.modal';
import { AppState } from '../global/app.reducer';

describe('UserEffects', () => {
  let effects: UserEffects;
  let actions: Subject<Action>;
  let storageMap: jasmine.SpyObj<StorageMap>;
  let state: FakeStore<AppState>;
  let modalService: jasmine.SpyObj<ModalService>;

  const testUser: IUser = Object.freeze({
    name: 'test user',
    uniqueId: 'some-guid',
    email: 'test@user',
    avatarUrl: 'https://test/test.png',
  });

  beforeEach(() => {
    actions = new Subject<Action>();
    storageMap = jasmine.createSpyObj<StorageMap>('StorageMap', ['get', 'set']);
    state = createFakeStore<AppState>();
    modalService = jasmine.createSpyObj<ModalService>('ModalService', ['open']);
    effects = new UserEffects(
      new Actions(actions),
      storageMap,
      (state as Partial<Store<AppState>>) as Store<AppState>,
      modalService
    );
  });

  describe('requestLoadUser', () => {
    it('should fetch the user from the storage map', fakeAsync(() => {
      // arrange preconditions
      storageMap.get.and.returnValue(of(null));
      // arrange expectation
      effects.requestLoadUser.subscribe(() => {
        expect(storageMap.get).toHaveBeenCalled();
      });

      // act
      actions.next(requestLoadUser());
      tick();
    }));
    describe('when user exists', () => {
      let result: UpdateUserAction;

      beforeEach(fakeAsync(() => {
        // arrange preconditions
        storageMap.get.and.returnValue(of(testUser));

        // arrange results
        effects.requestLoadUser.subscribe((resultingAction) => {
          result = resultingAction as UpdateUserAction;
        });

        // act
        actions.next(requestLoadUser());
        tick();
      }));
      afterEach(() => (result = undefined));

      it('should dispatch `updateUser`', () =>
        expect(result).toEqual(updateUser({ user: testUser })));
    });

    describe('when user does not exist', () => {
      let result: RequestEditUserAction;
      beforeEach(fakeAsync(() => {
        // arrange preconditions
        storageMap.get.and.returnValue(of(null));

        // arrange results
        effects.requestLoadUser.subscribe((resultingAction) => {
          result = resultingAction as RequestEditUserAction;
        });

        // act
        actions.next(requestLoadUser());
        tick();
      }));
      afterEach(() => (result = undefined));

      it('should dispatch `requestEditUser` with `mandatory` set to `true`', () =>
        expect(result).toEqual(requestEditUser({ mandatory: true })));
    });
  });

  describe('requestEditUser', () => {
    let result: UpdateUserAction;
    beforeEach(() => {
      // arrange precondisions
      modalService.open.and.returnValue({ result: of(testUser) } as any);
      // arrange results
      effects.requestEditUser.subscribe((resultingAction) => {
        result = resultingAction;
      });
    });
    afterEach(() => (result = undefined));

    it('should dispatch update user', fakeAsync(() => {
      // arrange preconditions
      state.next({ user: testUser });

      actions.next(requestEditUser({ mandatory: true }));
      tick();
      expect(result).toEqual(updateUser({ user: testUser }));
    }));

    describe('when mandatory is true', () => {
      beforeEach(fakeAsync(() => {
        // arrange preconditions
        state.next({ user: null });

        // act
        actions.next(requestEditUser({ mandatory: true }));
        tick();
      }));
      it('should open the modal with canCancel false', () =>
        expect(modalService.open).toHaveBeenCalledWith(UserSetupModal, {
          data: { user: null, canCancel: false },
        }));
    });

    describe('when mandatory is false', () => {
      beforeEach(fakeAsync(() => {
        // arrange preconditions
        state.next({ user: testUser });

        // act
        actions.next(requestEditUser({ mandatory: false }));
        tick();
      }));
      it('should open the modal with canCancel true', () =>
        expect(modalService.open).toHaveBeenCalledWith(UserSetupModal, {
          data: { user: testUser, canCancel: true },
        }));
    });
  });

  describe('updateUser', () => {
    let result: any;
    beforeEach(fakeAsync(() => {
      storageMap.set.and.returnValue(of(undefined));
      effects.storeUpdatedUser.subscribe((r) => (result = r));
      actions.next(updateUser({ user: testUser }));
      tick();
    }));
    it('should store the user', () =>
      expect(storageMap.set).toHaveBeenCalledWith(
        jasmine.any(String),
        testUser
      ));
    it('should not dispatch an action', () => expect(result).toBeUndefined());
  });
});

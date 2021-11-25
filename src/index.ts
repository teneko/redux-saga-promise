import { Dispatch, Middleware, MiddlewareAPI } from "redux";
import {
  ActionCreatorWithPayload,
  ActionCreatorWithPreparedPayload, createAction, PayloadAction, PayloadActionCreator, PrepareAction,
} from "@reduxjs/toolkit";
import { isFunction, merge } from "lodash";
import { call, CallEffect, SagaReturnType } from "redux-saga/effects";
import { _ActionCreatorWithPreparedPayload } from "@reduxjs/toolkit/dist/createAction";
import { ArgumentError } from "./ArgumentError";
import { ConfigurationError } from "./ConfigurationError";

type PromiseFromMeta<V> = {
  promise?: Promise<V>;
};

type PromiseActionsFromMeta<V, T extends string> = {
  promiseActions: {
    resolved: ActionCreatorWithPayload<V, T>;
    rejected: ActionCreatorWithPayload<any, `${T}/rejected`>;
  },
} & PromiseFromMeta<V>;

type PromiseResolutionFromMeta<V> = {
  promiseResolution: {
    resolve: (value: V) => void;
    reject: (error: any) => void;
  }
};

type SagaPromiseMeta<V, T extends string> = PromiseActionsFromMeta<V, T>;
type SagaPromiseMetaMutated<V, T extends string> = SagaPromiseMeta<V, T> & PromiseResolutionFromMeta<V>;

type SagaPromiseActionBase<V, P, T extends string, M extends PromiseActionsFromMeta<V, T>> = PayloadAction<P, T, M, never>;
type SagaPromiseAction<V, P, T extends string> = SagaPromiseActionBase<V, P, T, SagaPromiseMeta<V, T>>;
type SagaPromiseActionMutated<V, P, T extends string> = SagaPromiseActionBase<V, P, T, SagaPromiseMetaMutated<V, T>>;

type ActionCreatorWithPreparedPayloadAndMeta<V, P, T extends string, M extends PromiseActionsFromMeta<V, T>, PA extends PrepareAction<any>> =
  ActionCreatorWithPreparedPayload<Parameters<PA>, P, T, never, ReturnType<PA> extends {
    meta: infer InferM & M;
  } ? InferM : M>;

type Sagas<V, P, T extends string> = {
  implement: (action: SagaPromiseAction<V, P, T>, executor: TriggerExecutor<V>) => Generator<CallEffect<SagaReturnType<TriggerExecutor<V>>>, void, any>,
  resolve: (action: SagaPromiseAction<V, P, T>, value: V) => ReturnType<typeof resolvePromiseAction>,
  reject: (action: SagaPromiseAction<V, P, T>, error: any) => ReturnType<typeof rejectPromiseAction>
};

type SagasFromAction<V, P, T extends string> = {
  sagas: Sagas<V, P, T>
};

type TypesFromAction<V, P, T extends string, M extends PromiseActionsFromMeta<V, T>> = {
  types: {
    triggerAction: SagaPromiseActionBase<V, P, T, M>,
    resolvedAction: PayloadAction<V, T>,
    rejectedAction: PayloadAction<any, `${T}/rejected`>
    promise: Promise<V>,
    resolveValue: V
  }
};

type TriggerActionCreator<V, P, T extends string, M extends PromiseActionsFromMeta<V, T>, TA extends PayloadActionCreator<any, T>> = ActionCreatorWithPreparedPayloadAndMeta<V, P, T, M, TA>;

export type SagaPromiseActionCreator<V, P, T extends string, TA extends PayloadActionCreator<any, T>> = TriggerActionCreator<V, P, T, PromiseActionsFromMeta<V, T>, TA> & {
  trigger: SagaPromiseActionCreator<V, P, T, TA>
  resolved: ActionCreatorWithPayload<V, T>;
  rejected: ActionCreatorWithPayload<any, `${T}/rejected`>;
} & SagasFromAction<V, P, T> & TypesFromAction<V, P, T, PromiseActionsFromMeta<V, T>>;

export type SagaPromisePreparedActionCreator<V, T extends string, TA extends PrepareAction<any>> = SagaPromiseActionCreator<V, ReturnType<TA>["payload"], T, _ActionCreatorWithPreparedPayload<TA, T>>;

function isTriggerAction(action: SagaPromiseAction<any, any, any>) {
  return action?.meta?.promiseActions.resolved != null;
}

function isActionSagaPromise(action: SagaPromiseAction<any, any, any>, method): action is SagaPromiseActionMutated<any, any, any> {
  if (!isTriggerAction(action)) throw new ArgumentError(`redux-saga-promise: ${method}: first argument must be promise trigger action, got ${action}`);
  if (!isFunction((action as SagaPromiseActionMutated<any, any, any>)?.meta?.promiseResolution?.resolve)) throw new ConfigurationError(`redux-saga-promise: ${method}: Unable to execute--it seems that promiseMiddleware has not been not included before SagaMiddleware`);
  return true;
}

type ResolveValueFromTriggerAction<TAction> = TAction extends {
  meta: PromiseFromMeta<infer V>;
} ? V : never;

function resolvePromise(action: SagaPromiseActionMutated<any, any, any>, value: any) {
  return action.meta.promiseResolution.resolve(value);
}

function rejectPromise(action: SagaPromiseActionMutated<any, any, any>, error: any) {
  return action.meta.promiseResolution.reject(error);
}

/**
 * Saga to resolve or reject promise depending on the executor function returns or throws.
 *
 * @param executor A function that returns a value or throws a error that get applied to promise.
 */
export function* implementPromiseAction<TAction extends SagaPromiseAction<any, any, any>>(action: TAction, executor: TriggerExecutor<ResolveValueFromTriggerAction<TAction>>) {
  if (!isActionSagaPromise(action, "implementPromiseAction")) {
    return; // Never hit, exception is thrown before
  }

  try {
    resolvePromise(action, yield call(executor));
  } catch (error) {
    rejectPromise(action, error);
  }
}

/**
 * Saga to resolve a promise.
 */
export function* resolvePromiseAction<TAction extends SagaPromiseAction<any, any, any>>(action: TAction, value: ResolveValueFromTriggerAction<TAction>) {
  if (!isActionSagaPromise(action, "resolvePromiseAction")) {
    return; // Never hit, exception is thrown before
  }

  yield call(resolvePromise, action, value);
}

/**
 * Saga to reject a promise.
 */
export function* rejectPromiseAction<TAction extends SagaPromiseAction<any, any, any>>(action: TAction, error: any) {
  if (!isActionSagaPromise(action, "rejectPromiseAction")) {
    return; // Never hit, exception is thrown before
  }

  yield call(rejectPromise, action, error);
}

function createPromiseActions<V, T extends string>(type: T) {
  return {
    resolvedAction: createAction<V>(`${type}/resolved`),
    rejectedAction: createAction<any>(`${type}/rejected`),
  };
}

type TriggerExecutor<RT> = (() => PromiseLike<RT> | RT | Iterator<any, RT, any>);

function wrapTriggerAction<V, P, T extends string, TA extends PayloadActionCreator<any, T>>(
  type: T,
  triggerAction: TA,
): SagaPromiseActionCreator<V, P, T, TA> {
  const { resolvedAction, rejectedAction } = createPromiseActions<V, T>(type);

  const updatedTrigger = <TriggerActionCreator<V, P, T, SagaPromiseMeta<V, T>, TA>>createAction(type, (...args: any[]) => merge(triggerAction.apply(null, args), {
    meta: <SagaPromiseMeta<V, T>>{
      promiseActions: {
        resolved: resolvedAction,
        rejected: rejectedAction,
      },
    },
  }));

  const sagas = <Sagas<V, P, T>>{
    implement: implementPromiseAction,
    resolve: resolvePromiseAction,
    reject: rejectPromiseAction,
  };

  return <any>Object.assign(updatedTrigger, {
    trigger: updatedTrigger,
    resolved: resolvedAction,
    rejected: rejectedAction,
    sagas,
  });
}

function createPromiseAction<V = any, P = void, T extends string = string>(type: T) {
  const triggerAction = createAction<P, T>(type);

  return wrapTriggerAction<V, P, T, typeof triggerAction>(
    type,
    triggerAction,
  );
}

function createPreparedPromiseAction<V, PA extends PrepareAction<any> = PrepareAction<any>, T extends string = string>(type: T, prepareAction: PA) {
  const triggerAction = createAction<PA, T>(type, prepareAction);

  return wrapTriggerAction<V, ReturnType<PA>["payload"], T, typeof triggerAction>(
    type,
    triggerAction,
  );
}

interface PromiseActionFactory<V> {
  /**
   * A utility function to create an action creator for the given action type
   * string. The action creator accepts a single argument, which will be included
   * in the action object as a field called payload. The action creator function
   * will also have its toString() overriden so that it returns the action type,
   * allowing it to be used in reducer logic that is looking for that action type.
   * The created action contains promise actions to make redux-saga-promise work.
   *
   * @param type The action type to use for created actions.
   */
  create<P = void, T extends string = string>(type: T): SagaPromiseActionCreator<V, P, T, ActionCreatorWithPayload<P, T>>
  /**
   * A utility function to create an action creator for the given action type
   * string. The action creator accepts a single argument, which will be included
   * in the action object as a field called payload. The action creator function
   * will also have its toString() overriden so that it returns the action type,
   * allowing it to be used in reducer logic that is looking for that action type.
   * The created action contains promise actions to make redux-saga-promise work.
   *
   * @param type The action type to use for created actions.
   * @param prepare (optional) a method that takes any number of arguments and returns { payload } or { payload, meta }.
   *                If this is given, the resulting action creator will pass its arguments to this method to calculate payload & meta.
   */
  create<TA extends PrepareAction<any> = PrepareAction<any>, T extends string = string>(type: T, prepareAction: TA): SagaPromisePreparedActionCreator<V, T, TA>
}

/**
 * @template V Resolve type contraint for promise.
 */
export function promiseActionFactory<V = any>() {
  return {
    create(type: any, prepareAction?: any) {
      if (arguments.length === 0) {
        throw new ArgumentError("Type was expected");
      }

      if (arguments.length > 2) {
        throw new ArgumentError("Too many arguments");
      }

      if (arguments.length === 2) {
        return createPreparedPromiseAction(type, prepareAction);
      }

      return createPromiseAction(type);
    },
  } as any as PromiseActionFactory<V>;
}

/**
* For a trigger action a promise is created and returned, and the action's
* meta.promise is augmented with resolve and reject functions for use
* by the sagas.  (This middleware must come before sagaMiddleware so that
* the sagas will have those functions available.)
*
* Non-actionPromiseFactory actions won't get processed in any kind.
*/
export const promiseMiddleware: Middleware = (store: MiddlewareAPI) => (next: Dispatch) => (action) => {
  if (isTriggerAction(action)) {
    const promise = new Promise((resolve, reject) => next(merge(action, {
      meta: {
        promiseResolution: {
          resolve: (value) => {
            resolve(value);
            store.dispatch(action.meta.promiseActions.resolved(value));
          },
          reject: (error) => {
            reject(error);
            store.dispatch(action.meta.promiseActions.rejected(error));
          },
        },
      } as PromiseResolutionFromMeta<any>,
    })));

    return merge(promise, { meta: { promise } as PromiseFromMeta<any> });
  }

  return next(action);
};

export * from "./ArgumentError";
export * from "./ConfigurationError";

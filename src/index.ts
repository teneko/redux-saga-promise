import { Dispatch, Middleware, MiddlewareAPI } from "redux";
import {
  ActionCreatorWithPreparedPayload, createAction, PayloadAction, PayloadActionCreator, PrepareAction,
} from "@reduxjs/toolkit";
import { isFunction, merge } from "lodash";
import { call } from "redux-saga/effects";
import { ArgumentError } from "./ArgumentError";
import { ConfigurationError } from "./ConfigurationError";

const promiseSymbol = Symbol.for("@teroneko/redux-saga-promise");

type SymbolTagged<T> = { [promiseSymbol]: T };

type PromiseInstanceFromMeta<V> = {
  promise?: Promise<V>;
};

type PromiseActionsFromMeta<V, RSA extends PayloadActionCreator<any, any>, RJA extends PayloadActionCreator<any, any>> = {
  promiseActions: {
    resolved: RSA;
    rejected: RJA;
  },
} & PromiseInstanceFromMeta<V> & SymbolTagged<{ resolveValueType: V }>;

type PromiseResolutionFromMeta<V> = {
  promiseResolution: {
    resolve: (value: V) => void;
    reject: (error: any) => void;
  }
};

type ResolvablePromiseActionsFromMeta<V, RSA extends PayloadActionCreator<any, any>, RJA extends PayloadActionCreator<any, any>> = PromiseActionsFromMeta<V, RSA, RJA> & PromiseResolutionFromMeta<V>;

type PromiseActionsFromTriggerAction<TA = any, RSA = any, RJA = any> = {
  trigger: TA;
  resolved: RSA;
  rejected: RJA;
};

type ActionCreatorWithPreparedPayloadAndMeta<V, P, T extends string, M extends PromiseActionsFromMeta<V, any, any>, PA extends PrepareAction<any>> =
  ActionCreatorWithPreparedPayload<Parameters<PA>, P, T, never, ReturnType<PA> extends {
    meta: infer InferM & M;
  } ? InferM : M>;

type PayloadActionAndMeta<V, P, T extends string, M extends PromiseActionsFromMeta<V, any, any>> = PayloadAction<P, T, M, never>;

function isTriggerAction(action: PayloadAction<any, any, PromiseActionsFromMeta<any, any, any>>): action is PayloadAction<any, any, ResolvablePromiseActionsFromMeta<any, any, any>> {
  return action?.meta?.promiseActions.resolved != null;
}

function verify(action, method) {
  if (!isTriggerAction(action)) throw new ArgumentError(`redux-saga-promise: ${method}: first argument must be promise trigger action, got ${action}`);
  if (!isFunction(action?.meta?.promiseResolution?.resolve)) throw new ConfigurationError(`redux-saga-promise: ${method}: Unable to execute--it seems that promiseMiddleware has not been not included before SagaMiddleware`);
}

type ResolveValueFromTriggerAction<A extends PayloadActionAndMeta<any, any, any, any>> = A extends {
  meta: {
    [promiseSymbol]: {
      resolveValueType: infer V
    };
  }
} ? V : never;

function resolvePromise<TA extends PayloadActionAndMeta<any, any, any, ResolvablePromiseActionsFromMeta<any, any, any>>>(action: TA, value: ResolveValueFromTriggerAction<TA>) {
  return action.meta.promiseResolution.resolve(value);
}

function rejectPromise<TA extends PayloadActionAndMeta<any, any, any, ResolvablePromiseActionsFromMeta<any, any, any>>>(action: TA, error: any) {
  return action.meta.promiseResolution.reject(error);
}

/**
 * Saga to resolve or reject promise depending on the executor function returns or throws.
 *
 * @param executor A function that returns a value or throws a error that get applied on promise.
 */
export function* implementPromiseAction<TA extends PayloadActionAndMeta<any, any, any, any>>(action: TA, executor: TriggerExecutor<ResolveValueFromTriggerAction<TA>>) {
  verify(action, "implementPromiseAction");

  try {
    resolvePromise(action, yield call(executor));
  } catch (error) {
    rejectPromise(action, error);
  }
}

/**
 * Saga to resolve a promise.
 */
export function* resolvePromiseAction<TA extends PayloadActionAndMeta<any, any, any, any>>(action: TA, value: ResolveValueFromTriggerAction<TA>) {
  verify(action, "resolvePromiseAction");
  yield call(resolvePromise, action, value);
}

/**
 * Saga to reject a promise.
 */
export function* rejectPromiseAction<TA extends PayloadActionAndMeta<any, any, any, any>>(action: TA, error: any) {
  verify(action, "rejectPromiseAction");
  yield call(rejectPromise, action, error);
}

function createPromiseActions<T extends string>(type: T) {
  return {
    resolvedAction: createAction(`${type}/resolved`),
    rejectedAction: createAction(`${type}/rejected`),
  };
}

type TriggerExecutor<RT> = (() => PromiseLike<RT> | RT | Iterator<any, RT, any>);

function createUpdatedTrigger<V, P, T extends string, TA extends PayloadActionCreator<any, any>>(
  type: T,
  triggerAction: TA,
) {
  const { resolvedAction, rejectedAction } = createPromiseActions(type);

  const updatedTrigger = createAction(type, (...args: any[]) => merge(triggerAction.apply(null, args), {
    meta: {
      promiseActions: {
        resolved: resolvedAction,
        rejected: rejectedAction,
      },
      [promiseSymbol]: {},
    } as PromiseActionsFromMeta<any, any, any>,
  })) as ActionCreatorWithPreparedPayloadAndMeta<V, P, T, PromiseActionsFromMeta<V, typeof resolvedAction, typeof rejectedAction>, typeof triggerAction>;

  const types: {
    action: PayloadActionAndMeta<V, P, T, PromiseActionsFromMeta<V, typeof resolvedAction, typeof rejectedAction>>,
    promise: Promise<ResolveValueFromTriggerAction<PayloadActionAndMeta<V, P, T, PromiseActionsFromMeta<V, typeof resolvedAction, typeof rejectedAction>>>>,
    resolveValue: V
  } = {} as any;

  const sagas = {
    implement: implementPromiseAction as <TA2 extends typeof types["action"], RT extends ResolveValueFromTriggerAction<TA2>>(action: TA2, executor: TriggerExecutor<RT>) => ReturnType<typeof implementPromiseAction>,
    resolve: resolvePromiseAction as <TA2 extends typeof types["action"]>(action: TA2, value: ResolveValueFromTriggerAction<TA2>) => ReturnType<typeof resolvePromiseAction>,
    reject: rejectPromiseAction as <TA2 extends typeof types["action"]>(action: TA2, error: any) => ReturnType<typeof rejectPromiseAction>,
  };

  return Object.assign(updatedTrigger, {
    trigger: updatedTrigger,
    resolved: resolvedAction,
    rejected: rejectedAction,
    sagas,
  }) as (typeof updatedTrigger
    & SymbolTagged<true>
    & PromiseActionsFromTriggerAction<typeof updatedTrigger, typeof resolvedAction, typeof rejectedAction>
    & { sagas: typeof sagas }
    & { /** Only used for type resolution. It does not any contain values. */ types: typeof types });
}

function createPromiseAction<V = any, P = void, T extends string = string>(type: T) {
  const triggerAction = createAction<P, T>(type);

  return createUpdatedTrigger<V, P, T, typeof triggerAction>(
    type,
    triggerAction,
  );
}

function createPreparedPromiseAction<V, PA extends PrepareAction<any> = PrepareAction<any>, T extends string = string>(type: T, prepareAction: PA) {
  const triggerAction = createAction<PA, T>(type, prepareAction);

  return createUpdatedTrigger<V, ReturnType<PA>["payload"], T, typeof triggerAction>(
    type,
    triggerAction,
  );
}

export function promiseActionFactory<V = any>() {
  return {
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
    simple: <P = void, T extends string = string>(type: T) => createPromiseAction<V, P>(type),
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
    advanced: <PA extends PrepareAction<any> = PrepareAction<any>, T extends string = string>(type: T, prepareAction: PA) => createPreparedPromiseAction<V, PA>(type, prepareAction),
  };
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

    return merge(promise, { meta: { promise } as PromiseInstanceFromMeta<any> });
  }

  return next(action);
};

export * from "./ArgumentError";
export * from "./ConfigurationError";

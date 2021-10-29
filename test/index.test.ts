/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
import {
  applyMiddleware, createAction, createReducer, createStore,
} from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { call, take, takeEvery } from "redux-saga/effects";
import {
  ArgumentError,
  ConfigurationError,
  promiseActionFactory,
  implementPromiseAction,
  promiseMiddleware,
  rejectPromiseAction,
  resolvePromiseAction,
} from "../src/index";

describe("promiseAction", function () {
  describe.each([
    promiseActionFactory<string>().simple("simple"),
    promiseActionFactory<string>().advanced("prepared", null),
  ])("creator", function (actionCreator) {
    it(`${actionCreator.type} should have keys`, function () {
      expect(typeof actionCreator?.trigger).toBe("function");
      expect(typeof actionCreator?.resolved).toBe("function");
      expect(typeof actionCreator?.rejected).toBe("function");
      expect(typeof actionCreator?.sagas).toBe("object");

      expect(typeof actionCreator?.sagas.implement).toBe("function");
      expect(typeof actionCreator?.sagas.resolve).toBe("function");
      expect(typeof actionCreator?.sagas.reject).toBe("function");
    });
  });

  describe.each([
    promiseActionFactory<string>().simple("simple")(),
    promiseActionFactory<string>().advanced("prepared", () => ({ payload: { test: "" } }))(),
  ])("action", function (action) {
    it(`${action.type} should have keys`, function () {
      expect(action?.meta?.promiseActions?.resolved).toBeTruthy();
      expect(action?.meta?.promiseActions?.rejected).toBeTruthy();
    });
  });
});

const sagas = {
  //
  // Saga that uses implementPromiseAction().
  //
  // It will resolve or reject when it receives a control action
  //
  * implementSaga(action) {
    yield call(implementPromiseAction, action, function* () {
      const { payload: { resolveValue, rejectMessage } } = yield take(sagas.controlAction);
      if (resolveValue) {
        return resolveValue;
      }
      throw new Error(rejectMessage);
    });
  },

  //
  // Saga that uses resolvePromiseAction().
  //
  // It will resolve when it receives controlAction
  //
  * resolveSaga(action) {
    const { payload: { resolveValue } } = yield take(sagas.controlAction);
    yield call(resolvePromiseAction, action, resolveValue);
  },

  //
  // Saga that uses rejectPromiseAction().
  //
  // It will reject when it receives controlAction
  //
  * rejectSaga(action) {
    const { payload: { rejectMessage } } = yield take(sagas.controlAction);
    yield call(rejectPromiseAction, action, new Error(rejectMessage));
  },

  //
  // Define the control action used by the sagas.
  //
  controlAction: createAction("controlAction", (content) => ({ payload: { ...content } })),
};

/*
 * Test helper:  Create a promise action, and create a store with
 * everything hooked up, including a reducer for that action's lifecycle,
 * and with a root saga that calls the given saga when the action is
 * dispatched.
 */
function setup(saga, { withMiddleware = true } = {}) {
  //
  // Define the promise action we'll use in our tests.  To avoid possible
  // contamination, create a new one for each test
  //
  const promiseAction = promiseActionFactory<string>().simple<string>("promiseAction");

  //
  // Define a reducer that records the payloads of each phase
  //

  const initialState = { trigger: null, resolved: null, rejected: null };

  const reducer = createReducer(initialState, (builder) => builder
    .addCase(promiseAction.trigger, (state, { payload }) => ({ ...state, trigger: payload }))
    .addCase(promiseAction.resolved, (state, { payload }) => ({ ...state, resolved: payload }))
    .addCase(promiseAction.rejected, (state, { payload }) => ({ ...state, rejected: payload })));

  //
  // Create the store
  //
  let caughtError = null;
  const caughtMiddlewareError = () => caughtError;
  const sagaMiddleware = createSagaMiddleware({ onError: (error) => { caughtError = error; } });
  const middlewares = withMiddleware ? [promiseMiddleware, sagaMiddleware] : [sagaMiddleware];
  const store = createStore(reducer, initialState, applyMiddleware(...middlewares));

  //
  // Run the passed saga
  //
  sagaMiddleware.run(function* () { yield takeEvery(promiseAction, saga); });
  return { caughtMiddlewareError, promiseAction, store };
}

describe("implementPromiseAction", function () {
  it("should resolve", async () => {
    // Setup
    const { promiseAction, store } = setup(sagas.implementSaga);
    const triggerPayload = "triggerPayload";
    const resolveValue = "resolveValue";

    // Dispatch the promise action
    const { promise } = store.dispatch(promiseAction(triggerPayload)).meta;
    expect(promise instanceof Promise).toBeTruthy();

    // Verify trigger payload has been reduced
    expect(store.getState().trigger === triggerPayload).toBeTruthy();

    // Dispatch control action
    store.dispatch(sagas.controlAction({ resolveValue }));

    // Verify promise resolution
    const resolvedWith = await promise;
    expect(resolvedWith === resolveValue).toBeTruthy();

    // Verify reduced values
    expect(store.getState().trigger === triggerPayload).toBeTruthy();
    expect(store.getState().resolved === resolveValue).toBeTruthy();
    expect(store.getState().rejected == null).toBeTruthy();
  });

  it("should reject", async () => {
    // Setup
    const { promiseAction, store } = setup(sagas.implementSaga);
    const triggerPayload = "triggerPayload";
    const rejectMessage = "rejectMessage";

    // Dispatch the promise action
    const { promise } = store.dispatch(promiseAction(triggerPayload)).meta;

    // Verify trigger payload has been reduced
    expect(store.getState().trigger === triggerPayload).toBeTruthy();

    // Dispatch control action
    store.dispatch(sagas.controlAction({ rejectMessage }));

    // Verify promise rejection
    const error = await promise.catch((_error: any) => _error);
    expect(error.message === rejectMessage);

    // Verify reduced values
    expect(store.getState().trigger === triggerPayload).toBeTruthy();
    expect(store.getState().resolved == null).toBeTruthy();
    expect(store.getState().rejected === error).toBeTruthy();
  });

  it("should throw ArgumentError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.implementSaga);
    const bogusPromiseAction = () => ({ type: promiseAction.toString() }); // mimics promise action but doesn't have proper meta
    store.dispatch(bogusPromiseAction());
    expect(caughtMiddlewareError() instanceof ArgumentError).toBeTruthy();
  });

  it("should throw ConfigurationError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.implementSaga, { withMiddleware: false });
    store.dispatch(promiseAction());
    store.dispatch(sagas.controlAction({}));
    expect(caughtMiddlewareError() instanceof ConfigurationError).toBeTruthy();
  });

  it("should correctly infer value type", function () {
    const promiseAction = promiseActionFactory<string>().simple("test");
    call(promiseAction.sagas.implement, promiseAction(), async () => Promise.resolve(""));
    call(promiseAction.sagas.implement, promiseAction(), function* () { yield "dummy"; return ""; });
    call(promiseAction.sagas.implement, promiseAction(), () => "");
  });
});

describe("resolvePromiseAction", function () {
  it("should call", async function () {
    // Setup
    const { promiseAction, store } = setup(sagas.resolveSaga);
    const triggerPayload = "triggerPayload";
    const resolveValue = "resolveValue";

    // Dispatch the promise action, monitor resolution
    const { promise } = store.dispatch(promiseAction(triggerPayload)).meta;

    // Verify trigger payload has been reduced
    expect(store.getState().trigger === triggerPayload).toBeTruthy();

    // Dispatch control action
    store.dispatch(sagas.controlAction({ resolveValue }));

    // Verify promise resolution
    const resolvedWith = await promise;
    expect(resolvedWith === resolveValue).toBeTruthy();

    // Verify reduced values
    expect(store.getState().trigger === triggerPayload).toBeTruthy();
    expect(store.getState().resolved === resolveValue).toBeTruthy();
    expect(store.getState().rejected == null).toBeTruthy();
  });

  it("should throw ArgumentError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.resolveSaga);
    const bogusPromiseAction = () => ({ type: promiseAction.toString() }); // mimics promise action but doesn't have proper meta
    store.dispatch(bogusPromiseAction());
    store.dispatch(sagas.controlAction({}));
    expect(caughtMiddlewareError() instanceof ArgumentError).toBeTruthy();
  });

  it("should throw ConfigurationError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.resolveSaga, { withMiddleware: false });
    store.dispatch(promiseAction());
    store.dispatch(sagas.controlAction({}));
    expect(caughtMiddlewareError() instanceof ConfigurationError).toBeTruthy();
  });

  it("should correctly infer value type", function () {
    const promiseAction = promiseActionFactory<string>().simple("test");
    call(promiseAction.sagas.resolve, promiseAction(), "");
    call(promiseAction.sagas.resolve, promiseAction.trigger(), "");
  });
});

describe("rejectPromiseAction", function () {
  it("should call", async function () {
    // Setup
    const { promiseAction, store } = setup(sagas.rejectSaga);
    const triggerPayload = "triggerPayload";
    const rejectMessage = "rejectMessage";

    // Dispatch the promise action, monitor rejection
    const { promise } = store.dispatch(promiseAction(triggerPayload)).meta;

    // Verify trigger payload has been reduced
    expect(store.getState().trigger === triggerPayload).toBeTruthy();

    // Dispatch control action
    store.dispatch(sagas.controlAction({ rejectMessage }));

    // Verify promise rejection
    const error = await promise.catch((_error: any) => _error);
    expect(error.message === rejectMessage).toBeTruthy();

    // Verify reduced values
    expect(store.getState().trigger === triggerPayload).toBeTruthy();
    expect(store.getState().resolved == null).toBeTruthy();
    expect(store.getState().rejected === error).toBeTruthy();
  });

  it("should throw ArgumentError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.rejectSaga);
    const bogusPromiseAction = () => ({ type: promiseAction.toString() }); // mimics promise action but doesn't have proper meta
    store.dispatch(bogusPromiseAction());
    store.dispatch(sagas.controlAction({}));
    expect(caughtMiddlewareError() instanceof ArgumentError).toBeTruthy();
  });

  it("should throw ConfigurationError", function () {
    const { caughtMiddlewareError, promiseAction, store } = setup(sagas.rejectSaga, { withMiddleware: false });
    store.dispatch(promiseAction());
    store.dispatch(sagas.controlAction({}));
    expect(caughtMiddlewareError() instanceof ConfigurationError).toBeTruthy();
  });
});

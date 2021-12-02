<!-- omit in toc -->
# @teroneko/redux-saga-promise

_Use promises in redux sagas with TypeScript-first approach_

<!-- omit in toc -->
# Prologue

This projects aims to create promise actions (where each action has its deferred promise after surpassing the middleware) that are able to be fullfilled or rejected in redux-saga-manner.

Initially forked from [@adobe/redux-saga-promise](https://github.com/adobe/redux-saga-promise) but completelly revamped to use `createAction` from `@reduxjs/toolkit` to support **TypeScript**.

<!-- omit in toc -->
## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Promise middleware integration](#promise-middleware-integration)
- [Promise action creation](#promise-action-creation)
  - [Promise action with type](#promise-action-with-type)
  - [Promise action with type and payload creator](#promise-action-with-type-and-payload-creator)
- [Promise action fulfillment or rejection](#promise-action-fulfillment-or-rejection)
  - [implementPromiseAction](#implementpromiseaction)
  - [resolvePromiseAction](#resolvepromiseaction)
  - [rejectPromiseAction](#rejectpromiseaction)
- [Promise action's reducable lifecycle actions](#promise-actions-reducable-lifecycle-actions)
- [Promise action caveats](#promise-action-caveats)
- [Argument validation](#argument-validation)
- [TypeScript helper types](#typescript-helper-types)
- [Contributing](#contributing)
  - [Building & Testing](#building--testing)
- [Licensing](#licensing)

## Overview

* Redux middlware, namely `promiseMiddleware`, used to **transform** a promise-action-marked action (not promise action yet) to a fully qualified promise action that owns a deferred promise to allow a deferred fulfillment or rejection.
* Saga helpers namely
  * `implementPromiseAction()` to resolve and reject by passing either a generator function, an asnyc function or simply a function where the return value is used to fulfill the deferred promise inside the promise action,
  * `resolvePromiseAction()` to resolve-only the deferred promise inside the promise action and
  * `rejectPromiseAction()` to reject-only the deferred promise inside the promise action.
* Lifecyle actions namely
  * `promiseAction.trigger` (same instance like `promiseAction`) created by you (via `promiseAction()`) and dispatched against the redux store,
  * `promiseAction.resolved` created **after** the deferred promise has been resolved and
  * `promiseAction.rejected` created **after** the deferred promise has been rejected
  * to use in reducers or wherever you would need these actions.
* TypeScript helper types

## Installation

```
npm install @teroneko/redux-saga-promise
```

## Promise middleware integration

You must include include `promiseMiddleware` in the middleware chain, and it must come **before** `sagaMiddleware`:

```js
import { applyMiddleware, createStore } from "redux"
import { promiseMiddleware }            from "@teroneko/redux-saga-promise"
import createSagaMiddleware             from "redux-saga"

// ...assuming rootReducer and rootSaga are defined
const sagaMiddleware = createSagaMiddleware()
const store          = createStore(rootReducer, {}, applyMiddleware(promiseMiddleware, sagaMiddleware))
sagaMiddleware.run(rootSaga)
```

##  Promise action creation

Use the following create promise actions.

### Promise action with type

```typescript
import { promiseActionFactory } from "@teroneko/redux-saga-promise"

// creates a promise action with only a type (string)
const actionCreator = promiseActionFactory<resolve_value_type_for_promise>().create(type_as_string)
const action = promiseActionFactory<resolve_value_type_for_promise>().create(type_as_string)()
// equivalent to
const actionCreator = createAction(type_as_string)
const action = createAction(type_as_string)()
```

### Promise action with type and payload creator

```typescript
import { promiseActionFactory } from "@teroneko/redux-saga-promise"

// creates a promise action with only a type (string)
const actionCreator = promiseActionFactory<resolve_value_type_for_promise>().create<payload_type>(type_as_string)
const action = promiseActionFactory<resolve_value_type_for_promise>().create<payload_type>(type_as_string)({} as payload_type) // "as payload_type" just to show intention
// equivalent to
const actionCreator = createAction<payload_type>(type_as_string)
const action = createAction<payload_type>(type_as_string)({} as payload_type) // "as payload_type" just to show intention
```

## Promise action fulfillment or rejection

Either you use

* [`implementPromiseAction(action, function)`](#implementpromiseaction) to resolve and reject by passing either a generator function, an asnyc function or simply a function where the return value is used to fulfill the deferred promise,
* [`resolvePromiseAction(action, value)`](#resolvepromiseaction) to resolve-only the deferred promise inside the promise action or
* [`rejectPromiseAction(action, value)`](#rejectpromiseaction) to reject-only the deferred promise inside the promise action,

because it is up to you as the implementer to resolve or reject the promise"s action in a saga.

### implementPromiseAction

The most convenient way!  You give this helper a saga function which it
will execute.  If the saga function succesfully returns a value, the promise will
resolve with that value.   If the saga function throws an error, the promise
will be rejected with that error.  For example:

```js
import { call, takeEvery }        from "redux-saga/effects"
import { promises as fsPromises } from "fs"
import { implementPromiseAction } from "@teroneko/redux-saga-promise"

import promiseAction from "./promiseAction"

//
// Asynchronously read a file, resolving the promise with the file"s
// contents, or rejecting the promise if the file can"t be read.
//
function * handlePromiseAction (action) {
  yield call(implementPromiseAction, action, function * () {
    // 
    // Implemented as a simple wrapper around fsPromises.readFile.
    // Rejection happens implicilty if fsPromises.readFile fails.
    //
    const { path } = action.payload
    return yield call(fsPromises.readFile, path, { encoding: "utf8" })
  })
}

export function * rootSaga () {
  yield takeEvery(promiseAction, handlePromiseAction)
})
```

If you call `implementPromiseAction()` with a first argument that is not a
promise action, it will throw an error (see [Argument Validation](#argument-validation) below).

### resolvePromiseAction

Sometimes you may want finer control, or want to be more explicit when you know an
operation won"t fail.  This helper causes the promise to resolve with the
passed value.  For example:

```js
import { call, delay, takeEvery } from "redux-saga/effects"
import { resolvePromiseAction }   from "@teroneko/redux-saga-promise"

import promiseAction from "./promiseAction"

//
// Delay a given number of seconds then resolve with the given value.
//
function * handlePromiseAction (action) {
  const { seconds, value } = action.payload
  yield delay(seconds*1000)
  yield call(resolvePromiseAction, action, value)
}

function * rootSaga () {
  yield takeEvery(promiseAction, handlePromiseAction)
})
```

If you call `resolvePromiseAction()` with a first argument that is not a
promise action, it will throw an error (see [Argument Validation](#argument-validation) below).

### rejectPromiseAction

Sometimes you may want finer control, or want to explicitly fail without needing to `throw`. This helper causes the promise to reject with the
passed value, which typically should be an `Error`.  For example:

```js
import { call, takeEvery }     from "redux-saga/effects"
import { rejectPromiseAction } from "@teroneko/redux-saga-promise"

import promiseAction from "./promiseAction"

//
// TODO: Implement this!   Failing for now
//
function * handlePromiseAction (action) {
  yield call(rejectPromiseAction, action, new Error("Sorry, promiseAction is not implemented yet")
}

function * rootSaga () {
  yield takeEvery(promiseAction, handlePromiseAction)
})
```

If you call `rejectPromiseAction()` with a first argument that is not a
promise action, it will throw an error (see [Argument Validation](#ArgumentValidation) below).


##  Promise action's reducable lifecycle actions

Commonly you want the redux store to reflect the status of a promise action:
whether it"s pending, what the resolved value is, or what the rejected error
is.

Behind the scenes, `promiseAction = promiseActionFactory().create("MY_ACTION")` actually
creates a suite of three actions:

* `promiseAction.trigger`: An alias for `promiseAction`, which is what you dispatch that then creates the promise.

* `promiseAction.resolved`: Dispatched automatically by `promiseMiddleware` when the promise is resolved; its payload is the resolved value of the promise

* `promiseAction.rejected`: Dispatched automatically by `promiseMiddleware` when the promise is rejected; its payload is the rejection error of the promise

You can easily use them in `handleActions` of [redux-actions](https://redux-actions.js.org) or `createReducer` of `@reduxjs/toolkit`:

```js
import { handleActions } from "redux-actions"
import promiseAction from "./promiseAction"

//
// For the readFile wrapper described above, we can keep track of the file in the store
//
export const reducer = handleActions({
    [promiseAction.trigger]:  (state, { payload: { path } }) => ({ ...state, file: { path, status: "reading"} }),
    [promiseAction.resolved]: (state, { payload: contents }) => ({ ...state, file: { path: state.file.path, status: "read", contents } }),
    [promiseAction.rejected]: (state, { payload: error })    => ({ ...state, file: { path: state.file.path, status: "failed", error } }),
  }, {})
```

## Promise action caveats

In the sagas that perform your business logic, you may at times want to dispatch a promise action and wait for it to resolve.  You can do that using redux-saga"s [`putResolve`](http://redux-saga.js.org/docs/api/#putresolveaction) Effect:

```const result = yield putResolve(myPromiseAction)```

This dispatches the action and waits for the promise to resolve, returning the resolved  value.  Or if the promise rejects it will bubble up an error.

*Caution!* If you use [`put()`](http://redux-saga.js.org/docs/api/#putaction`) instead of `putResolve()`, the saga will continue execution immediately without waiting for the promise to resolve.

## Argument validation

To avoid accidental confusion, all the helper functions validate their
arguments and will throw a custom `Error` subclass `ArgumentError` in case
of error.  This error will be bubbled up by redux-saga as usual, and as usual you can catch it in a saga otherwise it will will bubble up to the [`onError`](https://redux-saga.js.org/docs/api/#createsagamiddlewareoptions) hook.  If you want to, you can test the error type, e.g.:

```js
import { applyMiddleware, compose, createStore } from "redux"
import { ArgumentError, promiseMiddleware }      from "@teroneko/redux-saga-promise"
import createSagaMiddleware                      from "redux-saga"

// ...assuming rootReducer and rootSaga are defined
const sagaMiddleware = createSagaMiddleware({ onError: (error) => {
  if (error instanceof ArgumentError) {
    console.log("Oops, programmer error! I called redux-saga-promise incorrectly:", error)
  } else {
    // ...
  }
})
const store = createStore(rootReducer, {}, compose(applyMiddleware(promiseMiddleware, sagaMiddleware)))
sagaMiddleware.run(rootSaga)
```

Additionally, all the helper functions will throw a custom `Error` subclass `ConfigurationError` if `promiseMiddleware` was not properly included in the store.

## TypeScript helper types

`promiseAction.types ` does not really exist. It only exists as TypeScript-type to make use of `typeof`:

```typescript
const promiseAction = promiseActionFactory<number>().create("MY_ACTION");

declare const typeOfPromiseThatGotCreatedOfPromiseMiddleware: typeof promiseAction.types.promise;
const promise = store.dispatch(promiseAction()).meta.promise; // or
const promise = store.dispatch(promiseAction()) as any as typeof promiseAction.types.promise;

declare const type_of_trigger_action_that_got_created_from_the_simple_or_advanced_action_creator: typeof promiseAction.types.triggerAction;
declare const type_of_resolved_action_that_got_created_from_the_simple_or_advanced_action_creator: typeof promiseAction.types.resolvedAction;
declare const type_of_rejected_action_that_got_created_from_the_simple_or_advanced_action_creator: typeof promiseAction.types.rejectedAction;
declare const type_of_resolved_value_from_promise_of_promise_action: typeof promiseAction.types.resolveValue;
```

`redux-saga` cannot infer the parameters and return type of `promiseAction` correctly when using the call effect or equivalent, so you can use the pre-typed sagas:

```javascript
const { implement, resolve, reject } = promiseAction.sagas;

// Instead of this...
call(implementPromiseAction, promiseAction(), () => 2);
// ... use this for better TypeScript support:
call(promiseAction.sagas.implement, promiseAction(), () => 2);
```

## Contributing

### Building & Testing

`package.json` defines the usual scripts:

* `npm build`: transpiles the source, placing the result in `dist/src/index.js`
* `npm test`: builds, and then runs the test suite.

The tests are written using `ts-jest`;


## Licensing

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for more information.

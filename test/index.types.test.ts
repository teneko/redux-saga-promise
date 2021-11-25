/* eslint-disable @typescript-eslint/no-unused-vars */
import { promiseActionFactory } from "../src";

const promiseAction = promiseActionFactory<number>().create("MY_ACTION");

declare const typeOfTriggerActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.triggerAction;
declare const typeOfResolvedActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.resolvedAction;
declare const typeOfRejectedActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.rejectedAction;
declare const typeOfPromiseThatGotCreatedOfPromiseMiddleware: typeof promiseAction.types.promise;
declare const typeOfResolvedValueFromPromiseThatGotCreatedOfPromiseMiddleware: typeof promiseAction.types.resolveValue;

interface Payload {
  data: any
}

const mustExpectPayload = promiseActionFactory<number>().create<Payload>("MY_ACTION")({ data: {} });
const mustExpectInferredPayload = promiseActionFactory<number>().create("MY_ACTION", (payload: Payload) => ({ payload }))({ data: {} });

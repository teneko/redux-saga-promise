/* eslint-disable @typescript-eslint/no-unused-vars */
import { merge } from "lodash";
import { promiseActionFactory } from "../src";

test.skip("workaround", () => 1);

const promiseAction = promiseActionFactory<number>().create("MY_ACTION");
declare const typeOfTriggerActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.triggerAction;
declare const typeOfResolvedActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.resolvedAction;
declare const typeOfRejectedActionThatGotCreatedFromTheSimpleOrAdvancedActionCreator: typeof promiseAction.types.rejectedAction;
declare const typeOfPromiseThatGotCreatedOfPromiseMiddleware: typeof promiseAction.types.promise;
declare const typeOfResolvedValueFromPromiseThatGotCreatedOfPromiseMiddleware: typeof promiseAction.types.resolveValue;

interface ParameterOne {
  oneData: any
}

interface ParameterTwo {
  twoData: any
}

const simpleActionMustExpectPayload = promiseActionFactory<number>().create<ParameterOne>("MY_ACTION")({ oneData: {} });
const advancedActionMustExpectInferredPayload = promiseActionFactory<number>().create("MY_ACTION", (one: ParameterOne, two: ParameterTwo) => ({ payload: merge(one, two) }))({ oneData: {} }, { twoData: {} });

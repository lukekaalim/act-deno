import {
  HookImplementation, hookImplementation, Context,
  ValueOrCalculator, calculateValue, StateSetter,
  runUpdater,
  createId,
  calculateDepsChange
} from "@lukekaalim/act";
import { ComponentState, EffectID } from "./state";
import { CommitID, CommitRef } from "./commit";
import { ElementOutput } from "./element";
import { ContextState, findContext } from "./context";

/**
 * A fresh set of hook functions is created per component run.
 */
export const loadHooks = (
  contexts: Map<CommitID, ContextState<unknown>>,
  requestRender: (ref: CommitRef) => void,

  state: ComponentState,
  ref: CommitRef,

  output: ElementOutput
) => {
  let index = 0;
  hookImplementation.useContext = <T>(context: Context<T>): T => {
    let value = state.contexts.get(index);
    if (!value) {
      value = { state: findContext(contexts, ref, context) };
      state.contexts.set(index, value);
      if (value.state)
        value.state.consumers.set(ref.id, ref);
    }
    if (value.state)
      return value.state.value as T;
    return context.defaultValue;
  };
  hookImplementation.useState = <T>(initialValue: ValueOrCalculator<T>) => {
    const stateIndex = index++;
    if (!state.values.has(stateIndex))
      state.values.set(stateIndex, calculateValue(initialValue));

    const value = state.values.get(stateIndex) as T;
    const setValue: StateSetter<T> = (updater) => {
      const prevValue = state.values.get(stateIndex) as T;
      const nextValue = runUpdater(prevValue, updater);
      state.values.set(stateIndex, nextValue);
      requestRender(ref);
    };
    return [value, setValue];
  }
  hookImplementation.useEffect = (effect, deps = null) => {
    const effectIndex = index++;
    if (!state.effects.has(effectIndex))
      state.effects.set(effectIndex, createId());
    
    const prevDeps = state.deps.get(effectIndex) || null;
    const effectId = state.effects.get(effectIndex) as EffectID;
    state.deps.set(effectIndex, deps);
    const depsChanges = calculateDepsChange(prevDeps, deps)
    if (depsChanges) {
      output.effects.push({
        id: effectId,
        commitId: ref.id,
        func() {
          const prevCleanup = state.cleanups.get(effectId);
          if (prevCleanup) {
            state.cleanups.delete(effectId);
            prevCleanup();
          }
          state.cleanups.set(effectId, effect());
        }
      });
    }
  };
};
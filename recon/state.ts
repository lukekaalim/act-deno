import { CommitRef, CommitID } from "./commit.ts";
import { ContextManager } from "./context.ts";
import { act } from "./deps.ts";
import { EffectManager, EffectID } from "./effects.ts";
import { WorkThread } from "./thread.ts";

export type ComponentState = {
  ref: CommitRef;

  values:   Map<number, unknown>;
  deps:     Map<number, act.Deps>;
  effects:  Map<number, EffectID>;
  contexts:  Map<number, act.Context<unknown>>;
};

export const createStateManager = (
  effectManager: EffectManager,
  rerender: (ref: CommitRef) => unknown,
  contextManager: ContextManager | null = null
) => {
  const states = new Map<CommitID, ComponentState>();

  const createState = (ref: CommitRef): ComponentState => {
    const state = {
      ref,
      values: new Map(),
      effects: new Map(),
      deps: new Map(),
      contexts: new Map(),
    };
    states.set(ref.id, state);
    return state;
  };

  const loadHookImplementation = (thread: WorkThread, ref: CommitRef) => {
    const createHookImplementation = (): act.HookImplementation => {
      const state = states.get(ref.id) || createState(ref);
      let index = 0;
      return {
        useContext<T>(context: act.Context<T>): T {
          if (!contextManager)
            throw new act.MagicError();

          state.contexts.set(index, context as act.Context<unknown>);
          return contextManager.subscribeContext(ref, context);
        },
        useState<T>(initialValue: act.ValueOrCalculator<T>) {
          const stateIndex = index++;
          if (!state.values.has(stateIndex))
            state.values.set(stateIndex, act.calculateValue(initialValue));

          const value = state.values.get(stateIndex) as T;
          const setValue: act.StateSetter<T> = (updater) => {
            const prevValue = state.values.get(stateIndex) as T;
            const nextValue = act.runUpdater(prevValue, updater);
            state.values.set(stateIndex, nextValue);
            rerender(ref);
          };
          return [value, setValue];
        },
        useEffect(effect, deps = null) {
          const effectIndex = index++;
          if (!state.effects.has(effectIndex))
            state.effects.set(effectIndex, act.createId());
          const prevDeps = state.deps.get(effectIndex) || null;
          const effectId = state.effects.get(effectIndex) as EffectID;
          state.deps.set(effectIndex, deps);
          const depsChanges = act.calculateDepsChange(prevDeps, deps)
          if (depsChanges)
            effectManager.enqueueEffect(thread, effectId, effect);
          return;
        },
      };
    };

    const hooks = createHookImplementation();
    act.hookImplementation.useContext = hooks.useContext;
    act.hookImplementation.useState = hooks.useState;
    act.hookImplementation.useEffect = hooks.useEffect;
  };

  const calculateCommitChildren = (
    thread: WorkThread,
    element: act.Element,
    commit: CommitRef
  ) => {
    const component = typeof element.type === "function" && element.type;
    if (!component) return element.children;

    const children = element.children;

    const props = {
      ...element.props,
      children,
    } as Parameters<typeof component>[0];

    loadHookImplementation(thread, commit);
    const result = component(props);

    return result;
  };
  const clearCommitState = (thread: WorkThread, ref: CommitRef) => {
    const state = states.get(ref.id)
    if (!state)
      return;
    const effects = [...state.effects.values()];
    const contexts = [...state.contexts.values()];
    for (const effect of effects)
      effectManager.enqueueTeardown(thread, effect);
    if (contextManager)
      for (const context of contexts)
        contextManager.unsubscribeContext(ref, context);
  };

  return { calculateCommitChildren, clearCommitState, states };
};

export type StateManager = ReturnType<typeof createStateManager>;

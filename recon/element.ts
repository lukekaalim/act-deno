import {
  ContextID, Element, errorBoundaryType, Node,
  providerNodeType
} from "@lukekaalim/act";
import { Commit, CommitID, CommitRef } from "./commit";
import { loadHooks } from "./hooks";
import { ContextState } from "./context";
import { ComponentState, EffectID, EffectTask } from "./state";
import { CommitTree } from "./tree";

/**
 * When processing an element, it may produce additional
 * pieces of information: new targets, side effects, and boundary
 * values
 */
export type ElementOutput = {
  child: Node,
  reject: null | unknown,
  effects: EffectTask[],
  targets: CommitRef[],
};
export const ElementOutput = {
  new: (child: Node): ElementOutput => ({
    child,
    reject: null,
    effects: [],
    targets: [],
  })
}

export type ElementService = {
  render(element: Element, ref: CommitRef): ElementOutput,
  clear(ref: Commit): ElementOutput,

  boundary: Map<CommitID, unknown>,
}

export const createElementService = (
  tree: CommitTree,
  requestRender: (ref: CommitRef) => void
): ElementService => {
  const contextStates = new Map<CommitID, ContextState<unknown>>();
  const componentStates = new Map<CommitID, ComponentState>();
  const boundaryValues = new Map<CommitID, unknown>();

  const render = (
    element: Element,
    ref: CommitRef,
  ): ElementOutput => {
    const output = ElementOutput.new(element.children);
  
    switch (typeof element.type) {
      case 'string':
        break;
      case 'symbol':
        switch (element.type) {
          case providerNodeType: {
            let state = contextStates.get(ref.id);
            if (!state) {
              state = {
                id: ref.id,
                contextId: element.props.id as ContextID,
                value: element.props.value,
                consumers: new Map(),
              }
              contextStates.set(ref.id, state);
            }
            if (state.value !== element.props.value) {
              state.value = element.props.value;
              output.targets.push(...state.consumers.values());
            }
            break;
          }
          case errorBoundaryType: {
            const error = CommitTree.getError(tree, ref.id);
            if (error.state === 'error')
              output.child = null;
            break;
          }
          default:
            break;
        }
        break;
      case 'function': {
        let state = componentStates.get(ref.id);
        if (!state) {
          state = {
            unmounted: false,
            ref,
            cleanups: new Map(),
            contexts: new Map(),
            values: new Map(),
            deps: new Map(),
            effects: new Map(),
          }
          componentStates.set(ref.id, state);
        }
        loadHooks(contextStates, requestRender, state, ref, output);
        const props = {
          ...element.props,
          children: element.children,
        } as Parameters<typeof element.type>[0];
        try {
          output.child = element.type(props);
        } catch (thrownValue) {
          output.child = null;
          output.reject = thrownValue;
        }
        break;
      }
      default:
        break;
    }
    return output;
  }
  const clear = (prev: Commit) => {
    const output = ElementOutput.new(null);
  
    switch (typeof prev.element.type) {
      case 'symbol': {
        switch (prev.element.type) {
          case providerNodeType:
            contextStates.delete(prev.id);
        }
        break;
      }
      case 'function': {
        const componentState = componentStates.get(prev.id) as ComponentState;
        componentState.unmounted = true;
        for (const [,context] of componentState.contexts) {
          if (context.state)
            context.state.consumers.delete(prev.id);
        }
        for (const [index, cleanup] of componentState.cleanups) {
          if (!cleanup)
            continue;
          const id = componentState.effects.get(index) as EffectID;
          output.effects.push({
            id,
            ref: prev,
            func: () => {
              cleanup();
            }
          });
        }
        componentStates.delete(prev.id);
        break;
      }
    }

    return output;
  }

  return { render, clear, boundary: boundaryValues };
}

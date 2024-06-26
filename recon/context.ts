import { act } from "./deps.ts";

import { CommitID, CommitRef, Commit } from "./commit.ts";
import { WorkThread } from "./thread.ts";

export type ContextManager = ReturnType<typeof createContextManager>;

export type ContextState<T> = {
  id: CommitID,
  contextId: act.ContextID,
  consumers: Map<CommitID, CommitRef>,
  value: T,
}

export const createContextManager = () => {
  const contextStates = new Map<CommitID, ContextState<unknown>>();

  return {
    /**
     * Take an element+commit, and if a change is detected,
     * the context value is updated and the consumers are returned.
     */
    processContextElement(element: act.Element, commitId: CommitID) {
      if (element.type !== act.providerNodeType)
        return;
      const prevState = contextStates.get(commitId) || {
        id: commitId,
        contextId: element.props.id as act.ContextID,
        consumers: new Map(),
        value: element.props.value,
      };

      if (prevState.value !== element.props.value || !contextStates.has(commitId)) {
        contextStates.set(commitId, { ...prevState, value: element.props.value })
        return [...prevState.consumers.values()];
      }
      return [];
    },
    subscribeContext<T>(ref: CommitRef, context: act.Context<T>): T {
      const contextsInPath = ref.path.map(id => contextStates.get(id)).reverse();
      
      const closestContextOfType = contextsInPath.find(cState => cState && cState.contextId === context.id);
      if (!closestContextOfType)
        return context.defaultValue;
      closestContextOfType.consumers.set(ref.id, ref);

      return closestContextOfType.value as T;
    },
    unsubscribeContext(ref: CommitRef, context: act.Context<unknown>) {
      const contextsInPath = ref.path.map(id => contextStates.get(id)).reverse();
      
      const closestContextOfType = contextsInPath.find(cState => cState && cState.contextId === context.id);
      if (!closestContextOfType)
        return;
      closestContextOfType.consumers.delete(ref.id);
    },
    deleteContextValue(ref: CommitRef) {
      contextStates.delete(ref.id);
    }
  };
};

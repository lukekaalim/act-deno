import { Context, ContextID } from "@lukekaalim/act";
import { CommitID, CommitRef } from "./commit.ts";

export type ContextState<T> = {
  id: CommitID,
  contextId: ContextID,
  consumers: Map<CommitID, CommitRef>,
  value: T,
}

export const findContext = <T>(contexts: Map<CommitID, ContextState<unknown>>, ref: CommitRef, context: Context<T>) => {
  for (const id of [...ref.path].reverse()) {
    const state = contexts.get(id);
    if (state && state.contextId === context.id) {
      return state;
    }
  }
  return null;
};

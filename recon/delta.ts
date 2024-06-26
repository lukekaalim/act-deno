import { convertNodeToElement } from "@lukekaalim/act/node.ts";
import { Commit, CommitID, CommitRef, updateCommit } from "./commit.ts";
import { StateManager } from "./state.ts";
import { WorkThread } from "./thread.ts";
import { Update, calcUpdates, calculateUpdates, findChildCommits } from "./update.ts";
import { act } from "./deps.ts";
import { ContextManager } from "./context.ts";

export type Delta = {
  ref: CommitRef,

  prev: null | Commit,
  next: null | Commit,
};

/** TODO: come up with better name */
export type TreePatch = {
  created: { ref: CommitRef, next: Commit },
  updated: { ref: CommitRef, next: Commit, prev: Commit },
  removed: { ref: CommitRef, prev: Commit },
};

export const createDeltaManager = (
  stateManager: StateManager,
  commits: Map<CommitID, Commit>,
  contextManager: ContextManager | null = null,
) => {
  /**
   * Given an Update, compute if there is any
   * change to the tree (a "Delta"), and if more updates
   * are needed to complete this work, appending them to
   * the work thread
   * */
  const applyUpdate = (
    thread: WorkThread,
    { next, prev, ref, targets }: Update
  ) => {
    /**
     * A change is considered identical if the "next element"
     * is the same as the "prev element" - its the same as there
     * being no change at all.
     * */
    const identicalChange = (next && prev && next.id === prev.element.id);
    /**
     * If we're "on a target's path", then we have to continue rendering.
     */
    const requiredChange = !!targets.find(target => target.path.includes(ref.id));
    const requiresRerender = targets.some(target => target.id === ref.id);

    if (identicalChange && !requiredChange)
      return;

    const prevChildren = prev && prev.children
      .map(c => commits.get(c.id) as Commit) || [];

    // If we have a "Next", then this is a request to either
    // Create or Update a commit.
    if (next) {
      if (identicalChange && !requiresRerender) {
        const updates = prevChildren.map(prev => ({ ref: prev, prev, next: prev.element, targets }));  
        thread.pendingUpdates.push(...updates);
        const commit = updateCommit(ref, prev.element, prev.children);
        thread.completedDeltas.push({ ref, prev, next: commit });
        return;
      }
      const contextTargets = contextManager && contextManager.processContextElement(next, ref.id) || [];
      const childNode = stateManager.calculateCommitChildren(thread, next, ref);

      const nodes = Array.isArray(childNode) ? childNode : [childNode];
      const elements = nodes.map(act.convertNodeToElement);

      const childCommits = findChildCommits(ref, prevChildren, elements);
      const updates = calcUpdates(childCommits, [...targets, ...contextTargets]);
      const childRefs = childCommits.newOrPersisted.map(n => n.ref);

      const commit = updateCommit(ref, next, childRefs);

      thread.completedDeltas.push({ ref, prev, next: commit });
      thread.pendingUpdates.push(...updates);
      return;
    }
    // If we have a prev, but no next, then this is a requets to
    // delete this commit. We still have emit "delete" updates
    // as well for all children of this node too.
    else if (prev && !next) {
      const [, updates] = calculateUpdates(ref, prevChildren, []);
      stateManager.clearCommitState(thread, ref);
      // No need to reclculate targets - no more re-rendering
      // will happen on this set of updates.

      thread.completedDeltas.push({ ref: prev, prev, next: null });
      thread.pendingUpdates.push(...updates);
      return;
    } else {
      throw new Error(`No prev, no next, did this commit ever exist?`)
    }
  };

  return { applyUpdate }
};

export type DeltaManager = ReturnType<typeof createDeltaManager>;
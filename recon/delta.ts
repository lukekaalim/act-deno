import { Commit, CommitID, CommitRef, updateCommit } from "./commit.ts";
import { StateManager } from "./state.ts";
import { WorkThread } from "./thread.ts";
import { Update, calculateUpdates } from "./update.ts";

/**
 * A processed "Update" to the tree - contains both before & after
 * commits, as well as a "neutral" ref (so you don't have to keep
 * testing if prev or next are null)
*/
export type Delta = {
  ref: CommitRef,

  prev: null | Commit,
  next: null | Commit,
};

export const createDeltaManager = (
  stateManager: StateManager,
  commits: Map<CommitID, Commit>,
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
      const children = stateManager.calculateCommitChildren(thread, next, ref);
      const [childRefs, updates] = calculateUpdates(ref, prevChildren, children);

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
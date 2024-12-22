import { Commit, CommitID, CommitRef, updateCommit } from "./commit.ts";
import { WorkThread } from "./thread.ts";
import { Update, calculateUpdates, isDescendant } from "./update.ts";
import { CommitTree } from "./tree.ts";
import { ComponentService } from "./component.ts";

export type CreateDelta = { ref: CommitRef, next: Commit };
export type UpdateDelta = { ref: CommitRef, next: Commit, prev: Commit };
export type RemoveDelta = { ref: CommitRef, prev: Commit };
export type SkipDelta =   { ref: CommitRef, next: Commit };


export type DeltaSet = {
  created: CreateDelta[],
  updated: UpdateDelta[],
  skipped: SkipDelta[],
  removed: RemoveDelta[],
};


/**
 * Given an Update, compute if there is any
 * change to the tree (a "Delta"), and if more updates
 * are needed to complete this work, appending them to
 * the work thread
 * */
export const applyUpdate = (
  tree: CommitTree,
  comp: ComponentService,
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
    .map(c => tree.commits.get(c.id) as Commit) || [];

  // If we have a "Next", then this is a request to either
  // Create or Update a commit.
  if (next) {

    // skip the change
    if (identicalChange && !requiresRerender) {
      const updates = prevChildren.map(prev => ({ ref: prev, prev, next: prev.element, targets }));  
      thread.pendingUpdates.push(...updates);
      const commit = Commit.update(ref, prev.element, prev.children);
      thread.deltas.skipped.push({ ref, next: commit });
      return;
    }

    const contextTargets = comp.context.processContextElement(next, ref.id) || [];
    const nextTargets = [...contextTargets, ...targets];

    const childNode = comp.state.calculateCommitChildren(thread, next, ref);

    const [childRefs, updates] = calculateUpdates(ref, prevChildren, childNode);
    const finalUpdates = updates.map(update => ({
      ...update,
      targets: nextTargets.filter(t => isDescendant(update.ref, t))
    }))

    const commit = Commit.update(ref, next, childRefs);

    if (prev)
      thread.deltas.updated.push({ ref, prev, next: commit });
    else
      thread.deltas.created.push({ ref, next: commit });

    thread.pendingUpdates.push(...finalUpdates);
    return;
  }
  // If we have a prev, but no next, then this is a requets to
  // delete this commit. We still have emit "delete" updates
  // as well for all children of this node too.
  else if (prev && !next) {
    const [, updates] = calculateUpdates(ref, prevChildren, []);
    comp.state.clearCommitState(thread, ref);
    // No need to reclculate targets - no more re-rendering
    // will happen on this set of updates.

    thread.deltas.removed.push({ ref: prev, prev });
    thread.pendingUpdates.push(...updates);
    return;
  } else {
    throw new Error(`No prev, no next, did this commit ever exist?`)
  }
};
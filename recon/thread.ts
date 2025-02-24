import { convertNodeToElements, createId, Element, ErrorBoundaryProps, errorBoundaryType, Node } from "@lukekaalim/act";
import { Commit, CommitID, CommitRef } from "./commit.ts";
import { DeltaSet } from "./delta.ts";
import { CommitTree } from "./tree.ts";
import { calculateUpdates, isDescendant, Update } from "./update.ts";
import { ElementService } from "./element.ts";
import { EffectTask } from "./state.ts";
import { ErrorBoundaryState } from "./errors.ts";
import { first, last } from "./algorithms.ts";

export type WorkReason =
  | { type: 'mount', element: Element }
  | { type: 'target', ref: CommitRef }

/**
 * Apply a thread to a tree, modifying it's commit list
 * to match the changes produced by the thread.
 * 
 * @param thread 
 * @param tree 
 */
const applyWorkThread = (thread: WorkThread, tree: CommitTree) => {
  DeltaSet.apply(thread.deltas, tree);
  return null;
}

const notifyErrorBoundaries = (thread: WorkThread, tree: CommitTree) => {
  for (const [boundaryId] of thread.errorNotifications) {
    const commit = tree.commits.get(boundaryId) as Commit;
    const { onError, ref } = commit.element.props as ErrorBoundaryProps;
    if (typeof onError === 'function') {
      const state = CommitTree.getError(tree, commit.id);
      onError(state.value);
    }
  }
}

/**
 * Remove all changes from a particular commit and all it's children
 * - essentially making it as if it had never rendered at all
 * @param thread
 * @param from 
 */
const rollbackWorkThread = (thread: WorkThread, from: CommitRef) => {
  // TODO: rollbacks are hard: need rollback compatible with new
  // thread model
  throw new Error();
  /*
  thread.deltas.created = thread.deltas.created.filter(d => !isDescendant(from, d.ref));
  thread.deltas.updated = thread.deltas.updated.filter(d => !isDescendant(from, d.ref));
  thread.deltas.removed = thread.deltas.removed.filter(d => !isDescendant(from, d.ref));
  thread.deltas.skipped = thread.deltas.skipped.filter(d => !isDescendant(from, d.next));

  thread.visited = new Set([...thread.visited].filter(v => !isDescendant(from, v)))

  thread.pendingUpdates = thread.pendingUpdates.filter(update => !isDescendant(from, update.ref))
  thread.pendingEffects = thread.pendingEffects.filter(effect => !isDescendant(from, effect.ref))
  */
}

const updateWorkThread = (thread: WorkThread, update: Update, tree: CommitTree, element: ElementService) => {
  const { next, prev, ref, moved } = update;
  thread.visited.set(ref.id, ref);

  const identicalChange = next && prev && (next.id === prev.element.id);
  const prevChildren = prev && prev.children
    .map(c => tree.commits.get(c.id) as Commit) || [];

  if (identicalChange) {
    const mustVisit = thread.mustVisit.has(ref.id);
    if (!mustVisit)
      return;

    const mustRender = thread.mustRender.has(ref.id);

    if (!mustRender) {
      const updates = prevChildren.map(prev => Update.skip(prev));  
      thread.pendingUpdates.push(...updates);
      const commit = Commit.version(prev);
      thread.deltas.skipped.push({ next: commit });
      return;
    }
  }
  
  if (next) {
    const output = element.render(next, ref);
    if (output.reject) {
      const errorBoundary = WorkThread.findClosestBoundary(thread, tree, ref);
      if (errorBoundary) {
        const errorState = CommitTree.getError(tree, errorBoundary.id);
        ErrorBoundaryState.set(errorState, output.reject);
        WorkThread.rollback(thread, errorBoundary);
        WorkThread.notifyError(thread, errorBoundary);

        thread.pendingUpdates.push(Update.target(errorBoundary));
        return;
      } else {
        console.error(output.reject);
        console.error(`No boundary to catch error: Unmounting roots`);
        for (const ref of tree.roots) {
          WorkThread.rollback(thread, ref);
          const prev = tree.commits.get(ref.id);
          if (prev)
            thread.pendingUpdates.push(Update.remove(prev));
        }
      }
    }

    const [childRefs, updates] = calculateUpdates(ref, prevChildren, output.child);

    thread.pendingEffects.push(...output.effects);
    thread.pendingUpdates.push(...updates);

    const commit = Commit.update(ref, next, childRefs);

    if (prev)
      thread.deltas.updated.push({ ref, prev, next: commit, moved });
    else
      thread.deltas.created.push({ ref, next: commit });

    // Update tree
    //tree.commits.set(ref.id, commit);

    return;
  }
  else if (prev && !next) {
    // We should delay this?
    const output = element.clear(prev);

    thread.deltas.removed.push({ ref: prev, prev });
    thread.pendingUpdates.push(...prevChildren.map(prev => Update.remove(prev)));
    thread.pendingEffects.push(...output.effects);
    return;
  } else {
    throw new Error(`No prev, no next, did this commit ever exist?`)
  }
};

/**
 * Start a new Update in the current Thread.
 * @param thread
 * @param ref 
 * @param tree 
 */
const startWorkThreadUpdate = (thread: WorkThread, ref: CommitRef, prev: Commit | null, next: Element | null) => {
  // Once a update starts,
  // all "parents" are considered to have been visited,
  // and cannot be rendered in this pass.
  for (const id of [...ref.path].reverse().slice(1))
    thread.visited.set(id, ref);

  thread.pendingUpdates.push({
    ref,
    prev,
    next,
    moved: false,
  })
}

/**
 * Request that a commit be re-rendered
 * @param thread 
 * @param ref 
 * @returns 
 */
const queueWorkThreadTarget = (thread: WorkThread, ref: CommitRef, tree: CommitTree): boolean => {
  // If the thread _already_ has this ref as a target,
  // do nothing
  if (thread.mustRender.has(ref.id))
    return true;

  // We cant do work on a commit that has
  // already been visited
  if (thread.visited.has(ref.id))
    return false;

  thread.reasons.push({ type: 'target', ref });
  thread.mustRender.set(ref.id, ref);

  // Search through all the parents, looking to see if
  // there are any pendingUpdates that might
  // lead to this commit. If so, make sure ancestor commit
  // is on the MustVisit so they should make their way down
  // eventually
  for (const id of [...ref.path].reverse().slice(1)) {
    thread.mustVisit.set(ref.id, ref);

    for (const update of thread.pendingUpdates) {
      if (update.ref.id === id)
        // Found an ancestor pending update - it should
        // handle our target eventually
        return true;
    }
  }
  // otherwise, start a new update from the root
  const prev = tree.commits.get(ref.id) as Commit;
  startWorkThreadUpdate(thread, ref, prev, prev.element);
  return true;
}
const queueWorkThreadMount = (thread: WorkThread, ref: CommitRef, element: Element) => {
  thread.reasons.push({ type: 'mount', element });
  startWorkThreadUpdate(thread, ref, null, element);
};


/**
 * A WorkThread is a mutable data structure that
 * represents a particular "Tree Traversal Task".
 * 
 * Its expected when you start rendering, you
 * may start rendering more nodes due to updates.
 * 
 * A thread can be "worked" to remove an update off the
 * "pending updates" list, which may optionally produce more
 * updates, effects, or error notification.
 */
export type WorkThread = {
  reasons: WorkReason[],
  
  mustRender: Map<CommitID, CommitRef>,
  mustVisit: Map<CommitID, CommitRef>,
  
  pendingUpdates: Update[],
  pendingEffects: EffectTask[],

  errorNotifications: Map<CommitID, CommitRef>,

  /**
   * A list of each commit the thread processed
   */
  visited: Map<CommitID, CommitRef>,
  deltas: DeltaSet,
};

export const cloneWorkThread = (thread: WorkThread): WorkThread => {
  return {
    reasons: [...thread.reasons],
    pendingEffects: [...thread.pendingEffects],
    pendingUpdates: [...thread.pendingUpdates],
    errorNotifications: new Map(thread.errorNotifications),

    mustVisit: new Map(thread.mustVisit),
    mustRender: new Map(thread.mustRender),

    visited: new Map(thread.visited),

    deltas: DeltaSet.clone(thread.deltas),
  }
}

export const WorkThread = {
  new(): WorkThread {
    return {
      reasons: [],
      pendingEffects: [],
      pendingUpdates: [],
      errorNotifications: new Map(),

      mustVisit: new Map(),
      mustRender: new Map(),

      visited: new Map(),

      deltas: DeltaSet.create(),
    }
  },
  rollback: rollbackWorkThread,
  apply: applyWorkThread,
  update: updateWorkThread,
  queueTarget: queueWorkThreadTarget,
  queueMount: queueWorkThreadMount,

  clone: cloneWorkThread,

  notifyError(thread: WorkThread, ref: CommitRef) {
    thread.errorNotifications.set(ref.id, ref);
  },
  /**
   * Find the closest ancestor error boundary for a commit,
   * either in the tree or one that was just created
   * */
  findClosestBoundary(thread: WorkThread, tree: CommitTree, ref: CommitRef): Commit | null {
    return last(ref.path, id => {
      if (tree.commits.has(id)) {
        const commit = tree.commits.get(id) as Commit;
        if (commit.element.type === errorBoundaryType)
          return commit;
        return null;
      }
      // We also might have just created the boundary
      const freshBoundary = thread.deltas.created.find(c => c.ref.id === id && c.next.element.type === errorBoundaryType);
      if (freshBoundary)
        return freshBoundary.next;
      return null;
    });
  }
}

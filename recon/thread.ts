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
const applyWorkThread = (thread: WorkThread, tree: CommitTree): null | WorkThread => {
  DeltaSet.apply(thread.deltas, tree);

  // add any pending work that couldnt be completed last thread
  if (thread.leftovers.size > 0) {
    return populateNextThread(thread.leftovers, tree);
  }
  return null;
}

const populateNextThread = (leftovers: Set<CommitRef>, tree: CommitTree): WorkThread => {
  const roots = CommitTree.getRootCommits(tree);
  const nextThread = WorkThread.new();

  const targets = [...leftovers];
  for (const root of roots) {
    nextThread.pendingUpdates.push(Update.distant(root, targets));
  }
  for (const target of leftovers)
    nextThread.reasons.push({ type: 'target', ref: target });

  return nextThread
}

const nofifyErrorBoundaries = (thread: WorkThread, tree: CommitTree) => {
  for (const boundaryId of thread.errorNotifications) {
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
  thread.deltas.created = thread.deltas.created.filter(d => !isDescendant(from, d.ref));
  thread.deltas.updated = thread.deltas.updated.filter(d => !isDescendant(from, d.ref));
  thread.deltas.removed = thread.deltas.removed.filter(d => !isDescendant(from, d.ref));
  thread.deltas.skipped = thread.deltas.skipped.filter(d => !isDescendant(from, d.next));
  thread.pendingUpdates = thread.pendingUpdates.filter(update => !isDescendant(from, update.ref))
  thread.pendingEffects = thread.pendingEffects.filter(effect => !isDescendant(from, effect.ref))
}

const updateWorkThread = (thread: WorkThread, update: Update, tree: CommitTree, element: ElementService) => {
  const { next, prev, ref, targets, moved } = update;
  thread.visited.add(ref.id);

  const identicalChange = next && prev && (next.id === prev.element.id);
  const prevChildren = prev && prev.children
    .map(c => tree.commits.get(c.id) as Commit) || [];

  if (identicalChange) {
    const isOnTargetPath = targets.some(target => target.path.includes(ref.id));
    if (!isOnTargetPath)
      return;

    const isSpecificallyTarget = targets.some(target => target.id === ref.id);

    if (!isSpecificallyTarget) {
      const updates = prevChildren.map(prev => Update.skip(prev, targets));  
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
    thread.pendingUpdates.push(...updates.map(update => ({
      ...update,
      targets: [...targets, ...output.targets.filter(t => isDescendant(update.ref, t))]
    })));

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

const queueWorkThreadUpdate = (thread: WorkThread, ref: CommitRef) => {
  for (const id of [...ref.path].reverse()) {
    // If we've already prepared a render, quit for next time
    if (thread.visited.has(ref.id)) {
      thread.leftovers.add(ref);
      return;
    }
    thread.pendingUpdates = thread.pendingUpdates.map(update => {
      if (update.ref.id === id)
        return Update.addTarget(update, ref);
      return update;
    });
  }
  throw new Error();
}


/**
 * A WorkThread is a mutable data struture that
 * represents a particular "Tree Travesal Task".
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

  pendingUpdates: Update[],
  pendingEffects: EffectTask[],

  errorNotifications: Set<CommitID>,

  /**
   * If a side effect or callback causes another render to happen
   * to a commit that has already been rendererd this 
   * */
  leftovers: Set<CommitRef>,

  /**
   * A list of each commit the thread proccessed
   */
  visited: Set<CommitID>,
  deltas: DeltaSet,
};
export const WorkThread = {
  new(): WorkThread {
    return {
      reasons: [],
      leftovers: new Set(),
      pendingEffects: [],
      pendingUpdates: [],
      errorNotifications: new Set(),
      visited: new Set(),
      deltas: DeltaSet.create(),
    }
  },
  rollback: rollbackWorkThread,
  apply: applyWorkThread,
  update: updateWorkThread,
  queue: queueWorkThreadUpdate,

  notifyError(thread: WorkThread, ref: CommitRef) {
    thread.errorNotifications.add(ref.id);
  },
  /**
   * Find the closest anscestor error boundary for a commit,
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

/*
  I think the thread manager should maybe have an event interface?

  // events
  onRequestWork
  onThreadComplete

  // methods
  rerender
  mount
  process
*/

import { convertNodeToElements, createId, ErrorBoundaryProps, errorBoundaryType, Node } from "@lukekaalim/act";
import { Commit, CommitID, CommitRef } from "./commit.ts";
import { DeltaSet } from "./delta.ts";
import { CommitTree } from "./tree.ts";
import { calculateUpdates, isDescendant, Update } from "./update.ts";
import { ElementService } from "./element.ts";
import { EffectTask } from "./state.ts";
import { ErrorBoundaryState } from "./errors.ts";
import { first, last } from "./algorithms.ts";

/**
 * A WorkThread is a mutable data struture that
 * represents a particular "Tree Travesal Task".
 * 
 * Its expected when you start rendering, you
 * may start rendering more nodes due to updates.
 */
export type WorkThread = {
  started: boolean,

  pendingUpdates: Update[],
  pendingEffects: EffectTask[],

  errorNotifications: Set<CommitID>,

  visited: Set<CommitID>,
  deltas: DeltaSet,
};
export const WorkThread = {
  new(): WorkThread {
    return {
      started: false,
      pendingEffects: [],
      pendingUpdates: [],
      errorNotifications: new Set(),
      visited: new Set(),
      deltas: {
        created: [],
        updated: [],
        removed: [],
        skipped: [],
      },
    }
  },
  /**
   * Remove all changes from a particular commit onward
   */
  rollback(thread: WorkThread, from: CommitRef) {
    thread.deltas.created = thread.deltas.created.filter(d => !isDescendant(from, d.ref));
    thread.deltas.updated = thread.deltas.updated.filter(d => !isDescendant(from, d.ref));
    thread.deltas.removed = thread.deltas.removed.filter(d => !isDescendant(from, d.ref));
    thread.deltas.skipped = thread.deltas.skipped.filter(d => !isDescendant(from, d.next));
    thread.pendingUpdates = thread.pendingUpdates.filter(update => !isDescendant(from, update.ref))
    thread.pendingEffects = thread.pendingEffects.filter(effect => !isDescendant(from, effect.ref))
  },
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

export const createThreadManager = (
  elementService: ElementService,
  tree: CommitTree,
  requestWork: () => void,
  onThreadComplete: (deltas: DeltaSet, effects: EffectTask[]) => unknown = _ => {},
) => {
  const pendingUpdateTargets = new Map<CommitID, CommitRef>();

  let currentThread = WorkThread.new();

  const run = () => {
    const update = currentThread.pendingUpdates.pop();
    if (update) {
      applyUpdate(currentThread, update);
    }
  }

  const work = (test: () => boolean) => {
    let tick = 0;

    while (currentThread.pendingUpdates.length > 0) {
      run()
      tick++;

      if (currentThread.pendingUpdates.length === 0) {
        apply();
      }

      // only test every 10 ticks
      if ((tick % 10 === 0) && test()) {
        // early exit
        return false;
      }
    }
    // completed all work
    return true;
  }

  const apply = () => {
    // Update the tree.
    for (const delta of currentThread.deltas.created)
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.skipped)
      tree.commits.set(delta.next.id, delta.next);
    
    for (const delta of currentThread.deltas.updated)
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.removed)
      tree.commits.delete(delta.ref.id);

    for (const boundaryId of currentThread.errorNotifications) {
      const commit = tree.commits.get(boundaryId) as Commit;
      const { onError } = commit.element.props as ErrorBoundaryProps;
      if (typeof onError === 'function') {
        const state = CommitTree.getError(tree, commit.id);
        const clear = () => {
          ErrorBoundaryState.clear(state);
          request(commit);
        }
        onError(state.value, clear);
      }
    }

    // Notify external
    onThreadComplete(currentThread.deltas, currentThread.pendingEffects);

    // clear the thread
    currentThread = WorkThread.new();

    // add any pending work that couldnt be completed last thread
    if (pendingUpdateTargets.size > 0) {
      const roots = CommitTree.getRootCommits(tree);
      const targets = [...pendingUpdateTargets.values()];
      for (const root of roots) {
        currentThread.pendingUpdates.push(Update.distant(root, targets));
      }
      
      pendingUpdateTargets.clear();
      currentThread.started = true;
      requestWork();
    }
  }

  const request = (target: CommitRef) => {
    if (currentThread.started) {
      const updateOnPath = currentThread.pendingUpdates.find(update => {
        return isDescendant(update.ref, target)
      })
      if (updateOnPath) {
        if (updateOnPath.targets.some(target => target.id === target.id)) {
          // not sure whats going on here
        } else {
          updateOnPath.targets.push(target);
        }
      } else {
        pendingUpdateTargets.set(target.id, target);
      }
    } else {
      const roots = CommitTree.getRootCommits(tree);
      for (const root of roots) {
        currentThread.started = true;
        currentThread.pendingUpdates.push(Update.distant(root, [target]));
      }
    }

    requestWork();
  }

  const mount = (root: Node) => {
    const elements = convertNodeToElements(root);
    for (const element of elements) {
      const id = createId<"CommitID">();
      const ref = { id, path: [id] };
      tree.roots.add(ref);
      currentThread.pendingUpdates.push(Update.fresh(ref, element));
    }

    requestWork();
  }

  const applyUpdate = (thread: WorkThread, { next, prev, ref, targets, moved }: Update) => {
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
      const output = elementService.render(next, ref);
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
      const output = elementService.clear(prev);
      thread.deltas.removed.push({ ref: prev, prev });
      thread.pendingUpdates.push(...prevChildren.map(prev => Update.remove(prev)));
      thread.pendingEffects.push(...output.effects);
      return;
    } else {
      throw new Error(`No prev, no next, did this commit ever exist?`)
    }
  };

  return { work, request, mount }
};

export type ThreadManager = ReturnType<typeof createThreadManager>;

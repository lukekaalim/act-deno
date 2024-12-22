import { convertNodeToElements } from "@lukekaalim/act";
import { Commit, CommitID, CommitRef } from "./commit.ts";
import { ComponentService } from "./component.ts";
import { applyUpdate, DeltaSet } from "./delta.ts";
import { act } from "./deps.ts";
import { EffectTask } from "./effects.ts";
import { CommitTree } from "./tree.ts";
import { Update } from "./update.ts";

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

  deltas: DeltaSet,
};
export const WorkThread = {
  new(): WorkThread {
    return {
      started: false,
      pendingEffects: [],
      pendingUpdates: [],
      deltas: {
        created: [],
        updated: [],
        removed: [],
        skipped: [],
      },
    }
  },
}

export const createThreadManager = (
  comp: ComponentService,
  tree: CommitTree,
  requestWork: () => void,
  onThreadComplete: (deltas: DeltaSet, effects: EffectTask[]) => unknown = _ => {},
) => {
  const pendingUpdateTargets = new Map<CommitID, CommitRef>();

  let currentThread = WorkThread.new();

  const run = () => {
    const update = currentThread.pendingUpdates.pop();
    if (update) {
      applyUpdate(tree, comp, currentThread, update);
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
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.updated)
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.removed)
      tree.commits.delete(delta.ref.id);

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
    }
  }

  const request = (target: CommitRef) => {
    if (currentThread.started) {
      // TODO: add new requests to the current thread
      // if they are compatible instead of scheduling another
      // thread.
      pendingUpdateTargets.set(target.id, target);
    } else {
      const roots = CommitTree.getRootCommits(tree);
      for (const root of roots) {
        currentThread.started = true;
        currentThread.pendingUpdates.push(Update.distant(root, [target]));
      }
    }

    requestWork();
  }

  const mount = (root: act.Node) => {
    const elements = convertNodeToElements(root);
    for (const element of elements) {
      const id = act.createId<"CommitID">();
      const ref = { id, path: [id] };
      tree.roots.add(ref);
      currentThread.pendingUpdates.push(Update.fresh(ref, element));
    }

    requestWork();
  }

  return { work, request, mount }
};

export type ThreadManager = ReturnType<typeof createThreadManager>;
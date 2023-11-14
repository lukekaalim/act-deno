import { Commit, CommitID, CommitRef } from "./commit.ts";
import { Delta, DeltaManager } from "./delta.ts";
import { act } from "./deps.ts";
import { EffectTask } from "./effects.ts";
import { Update } from "./update.ts";

/**
 * A WorkThread is a mutable data struture that
 * represents a particular "Tree Travesal Task".
 * 
 * Its expected when you start rendering, you
 * may start rendering more nodes due to updates.
 */
export type WorkThread = {
  root: CommitRef,

  pendingUpdates: Update[],
  pendingEffects: EffectTask[],

  completedDeltas: Delta[],
};

export const createThreadManager = (
  deltaManager: DeltaManager,
  commits: Map<CommitID, Commit>,
  rootRef: CommitRef,
  rootElement: act.Element,
  onThreadComplete: (thread: WorkThread) => unknown = _ => {},
) => {
  const pendingThreads = [];

  const runThread = (thread: WorkThread) => {
    const update = thread.pendingUpdates.pop();
    if (!update)
      return;
    deltaManager.applyUpdate(thread, update);
  }

  const syncThread = (thread: WorkThread) => {
    while (thread.pendingUpdates.length > 0) {
      runThread(thread)
    }
  }

  const applyThread = (thread: WorkThread) => {
    for (const delta of thread.completedDeltas)
      if (delta.next)
        commits.set(delta.ref.id, delta.next);
      else
        commits.delete(delta.ref.id)
    onThreadComplete(thread);
  }

  const requestRender = (target: CommitRef) => {
    const root = commits.get(rootRef.path[0]) || null;
    const thread: WorkThread = {
      root: rootRef,
      pendingEffects: [],
      pendingUpdates: [{ ref: rootRef, prev: root, next: rootElement, targets: [target] }],
      completedDeltas: [],
    }
    syncThread(thread);
    applyThread(thread);
  }

  return { runThread, syncThread, applyThread, requestRender }
};

export type ThreadManager = ReturnType<typeof createThreadManager>;
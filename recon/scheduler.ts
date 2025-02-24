import { convertNodeToElements, Node } from "@lukekaalim/act";
import { CommitID, CommitRef } from "./commit";
import { WorkThread } from "./thread"
import { CommitTree } from "./tree";
import { ElementService } from "./element";

/**
 * The Act Scheduler recipes requests to re-render
 * or mount parts of the tree, and coordinates and
 * processes the current work thread.
 */
export type Scheduler = {
  mount: (node: Node) => void,
  render: (ref: CommitRef) => void,

  getCurrentThread: () => null | WorkThread,
}

export type WorkRequest = { cancel: () => void };

export const createScheduler = (
  tree: CommitTree,
  element: ElementService,

  requestWork: (workFunc: () => void) => WorkRequest,
  onThreadComplete: (thread: WorkThread) => void,
  onThreadQueued: (thread: WorkThread) => void,
) => {
  let currentThread: WorkThread | null = null;
  let currentRequest: WorkRequest | null = null;

  let pendingTargets: Map<CommitID, CommitRef> = new Map();

  const work = () => {
    if (!currentThread)
      return;
    currentRequest = null;
    
    const update = currentThread.pendingUpdates.pop();
    if (update) {
      WorkThread.update(currentThread, update, tree, element);
      currentRequest = requestWork(work);
    } else {
      const completedThread = currentThread;
      currentThread = null;

      for (const [,target] of pendingTargets)
        render(target);
      pendingTargets.clear();

      WorkThread.apply(completedThread, tree);
      onThreadComplete(completedThread);
    }
  }
  const start = () => {
    currentThread = currentThread || WorkThread.new();
    currentRequest = currentRequest || requestWork(work);
    return currentThread;
  }

  const mount = (node: Node) => {
    const thread = start();
    const elements = convertNodeToElements(node)

    for (const element of elements) {
      const ref = CommitRef.new()
      tree.roots.add(ref);
      WorkThread.queueMount(thread, ref, element);
      onThreadQueued(thread);
    }
  };
  const render = (ref: CommitRef) => {
    const thread = start();

    if (WorkThread.queueTarget(thread, ref, tree)) {
      onThreadQueued(thread);
    } else {
      pendingTargets.set(ref.id, ref);
    }
  }
  const getCurrentThread = () => {
    return currentThread;
  }
  return { mount, render, getCurrentThread };
}
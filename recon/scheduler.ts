import { convertNodeToElements, Node } from "@lukekaalim/act";
import { CommitRef } from "./commit";
import { WorkThread } from "./thread"
import { CommitTree } from "./tree";
import { ElementService } from "./element";
import { Update } from "./update";

/**
 * The Act Scheduler recives requests to re-render
 * or mount parts of the tree, and coordinates and
 * proccesses the current work thread.
 */
export type Scheduler = {
  mount: (node: Node) => void,
  render: (ref: CommitRef) => void,
}

export type WorkRequest = { cancel: () => void };


export const createScheduler = (
  tree: CommitTree,
  element: ElementService,

  requestWork: (workFunc: () => void) => WorkRequest,
  onThreadComplete: (thread: WorkThread) => void
) => {
  let currentThread: WorkThread | null = WorkThread.new();
  let currentRequest: WorkRequest | null = null;

  const work = () => {
    if (!currentThread)
      return;
    
    const update = currentThread.pendingUpdates.pop();
    if (update) {
      WorkThread.update(currentThread, update, tree, element);
      currentRequest = requestWork(work);
    } else {
      onThreadComplete(currentThread);

      currentThread = WorkThread.apply(currentThread, tree);
      if (currentThread)
        currentRequest = requestWork(work);
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
      thread.pendingUpdates.push(Update.fresh(ref, element));
    }
  };
  const render = (ref: CommitRef) => {
    const thread = start();

    WorkThread.queue(thread, ref);
  }
  return { mount, render };
}
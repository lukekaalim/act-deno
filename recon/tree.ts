import { Commit, CommitID, CommitRef } from "./commit.ts";
import { act } from "./deps.ts";
import { ThreadManager, WorkThread } from "./thread.ts";

export const createTree = (
  threadManager: ThreadManager,
  commits: Map<CommitID, Commit>,
) => {
  let rootRef: CommitRef | null = null;

  const update = (node: act.Node) => {
    if (!rootRef)
      return;
    const rootCommit = commits.get(rootRef.id);
    if (!rootCommit)
      return;
    const element = act.convertNodeToElement(node)
    const thread: WorkThread = {
      root: rootCommit,
      pendingUpdates: [
        { ref: rootRef, prev: rootCommit, next: element, targets: [] }
      ],
      pendingEffects: [],
      completedDeltas: [],
    };
    threadManager.syncThread(thread);
    threadManager.applyThread(thread);
  };

  const mount = (node: act.Node) => {
    const element = act.convertNodeToElement(node)
    const id = act.createId<"CommitID">()
    rootRef = {
      id,
      path: [id]
    };
    const thread: WorkThread = {
      root: rootRef,
      pendingUpdates: [
        { ref: rootRef, prev: null, next: element, targets: [] }
      ],
      pendingEffects: [],
      completedDeltas: [],
    };
    threadManager.syncThread(thread);
    threadManager.applyThread(thread);
    return rootRef;
  };

  const unmount = () => {
    if (!rootRef)
      return;
    const rootCommit = commits.get(rootRef.id);
    if (!rootCommit)
      return;
    const thread: WorkThread = {
      root: rootCommit,
      pendingUpdates: [
        { ref: rootRef, prev: rootCommit, next: null, targets: [] }
      ],
      pendingEffects: [],
      completedDeltas: [],
    };
    threadManager.syncThread(thread);
    threadManager.applyThread(thread);
    rootRef = null;
  };

  return { mount, unmount, update }
};

export type Tree = ReturnType<typeof createTree>;
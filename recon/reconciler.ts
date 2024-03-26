import { createId, Element } from "@lukekaalim/act/mod.ts";
import { RenderSpace } from "@lukekaalim/act-backstage/mod.ts";


import { Commit, CommitID } from "./commit";
import { createDeltaManager, Delta } from "./delta";
import { createEffectManager } from "./effects";
import { createStateManager } from "./state";
import { createThreadManager, WorkThread } from "./thread";
import { createContextManager } from "./context";


export const createReconciler = (
  element: Element,
  space: RenderSpace,
  onAfterRender?: (delta: WorkThread) => unknown
) => {
  const commits: Map<CommitID, Commit> = new Map();
  const rootId = createId<"CommitID">();
  const rootRef = { id: rootId, path: [rootId] };
  
  const effectManager = createEffectManager();
  const contextManager = createContextManager();
  const stateManager = createStateManager(effectManager, (ref) => {
    setTimeout(() => {
      threadManager.requestRender(ref);
    }, 0);
  }, contextManager);
  const deltaManager = createDeltaManager(stateManager, commits, contextManager);
  const threadManager = createThreadManager(deltaManager, commits, rootRef, element, (thread) => {
    space
      .create(thread.completedDeltas, commits)
      .configure();
    
    for (const effect of thread.pendingEffects)
      effect.task();

    onAfterRender && onAfterRender(thread)
  });

  threadManager.requestRender(rootRef);

  return {
    deltaManager,
    effectManager,
    stateManager,
    threadManager,
    rootRef,
    commits,
  }
}
import { WorkThread } from "./thread";
import { CommitTree } from "./tree";
import { DeltaSet } from "./delta";
import { createElementService } from "./element";
import { createScheduler } from "./scheduler";

/**
 * A reconciler links all the relevant subsystems together.
 * 
 * @param space 
 * @param onAfterRender 
 * @returns 
 */
export const createReconciler = (
  render: (deltas: DeltaSet) => void,
  requestWork: () => void,
) => {
  const tree = CommitTree.new();
  const elements = createElementService(tree, ref => scheduler.render(ref));

  const onThreadComplete = (thread: WorkThread) => {
    render(thread.deltas);
    
    // immedialty execute all side effects
    for (const effect of thread.pendingEffects)
      effect.func();
  }

  const scheduler = createScheduler(tree, elements, () => {
    requestWork();
    return { cancel() { } }
  }, onThreadComplete)

  return {
    scheduler,
    elements,
    tree,
  }
}
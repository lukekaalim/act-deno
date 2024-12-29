import { createThreadManager } from "./thread";
import { CommitTree } from "./tree";
import { DeltaSet } from "./delta";
import { createElementService } from "./element";
import { EffectTask } from "./state";

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
  const elements = createElementService(ref => threads.request(ref));

  const onThreadComplete = (deltas: DeltaSet, effects: EffectTask[]) => {
    render(deltas);
    
    // immedialty execute all side effects
    for (const effect of effects)
      effect.func();
  }

  const threads = createThreadManager(elements, tree, requestWork, onThreadComplete);

  return {
    threads,
    elements,
    tree,
  }
}
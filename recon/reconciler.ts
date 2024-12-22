
import { createThreadManager, WorkThread } from "./thread";
import { CommitTree } from "./tree";
import { ComponentService } from "./component";
import { DeltaSet } from "./delta";

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
  const components = ComponentService.create(ref => {
    threads.request(ref);
  });

  const threads = createThreadManager(components, tree, requestWork, (deltas, effects) => {
    render(deltas);
    
    // immedialty execute all side effects
    for (const effect of effects)
      effect.task();
  });

  return {
    threads,
    components,
    tree,
  }
}
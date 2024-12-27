import { Node } from "@lukekaalim/act";
import { CommitRef } from "./commit";
import { ContextManager, createContextManager } from "./context"
import { createEffectManager, EffectManager, EffectTask } from "./effects"
import { createStateManager, StateManager } from "./state"

export type ComponentService = {
  state: StateManager,
  effect: EffectManager,
  context: ContextManager,
};

export const ComponentService = {
  create: (requestRender: (ref: CommitRef) => unknown): ComponentService => {
    const effect = createEffectManager();
    const context = createContextManager();
    const state = createStateManager(effect, requestRender, context);

    return {
      effect,
      context,
      state,
    }
  }
}

import { EffectCleanup, EffectConstructor, OpaqueID } from "@lukekaalim/act";
import { WorkThread } from "./thread.ts";

export type EffectID = OpaqueID<"EffectID">;
export type EffectTask = {
  id: EffectID,
  task: () => void,
}

export const createEffectManager = () => {
  const cleanups = new Map<EffectID, EffectCleanup>();

  const enqueueEffect = (
    thread: WorkThread,
    id: EffectID,
    effect: EffectConstructor
  ) => {
    thread.pendingEffects.push({
      id,
      task() {
        const cleanup = cleanups.get(id);
        if (cleanup) {
          cleanups.delete(id);
          cleanup();
        }
        cleanups.set(id, effect());
      }
    });
  };
  const enqueueTeardown = (
    thread: WorkThread,
    id: EffectID,
  ) => {
    thread.pendingEffects.push({
      id,
      task() {
        const cleanup = cleanups.get(id);
        if (cleanup) {
          cleanups.delete(id);
          cleanup();
        }
      }
    })
  };

  return { enqueueEffect, enqueueTeardown };
};

export type EffectManager = ReturnType<typeof createEffectManager>;
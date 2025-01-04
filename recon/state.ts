import { CommitRef } from "./commit.ts";
import { ContextState } from "./context.ts";
import * as act from '@lukekaalim/act';


export type EffectID = act.OpaqueID<"EffectID">;
export type EffectTask = {
  ref: CommitRef,
  id: EffectID,
  func: () => void,
}

export type ComponentState = {
  ref: CommitRef;

  unmounted: boolean,

  values:   Map<number, unknown>;
  deps:     Map<number, act.Deps>;
  effects:  Map<number, EffectID>;
  cleanups:  Map<number, act.EffectCleanup>;
  contexts:  Map<number, { state: null | ContextState<unknown> }>;
};

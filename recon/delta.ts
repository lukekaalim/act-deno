import { Commit, CommitRef } from "./commit.ts";
import { CommitTree } from "./tree.ts";

export type CreateDelta = { ref: CommitRef, next: Commit };
export type UpdateDelta = { ref: CommitRef, next: Commit, prev: Commit, moved: boolean };
export type RemoveDelta = { ref: CommitRef, prev: Commit };
export type SkipDelta =   { next: Commit };

export type DeltaSet = {
  created: CreateDelta[],
  updated: UpdateDelta[],
  skipped: SkipDelta[],
  removed: RemoveDelta[],
};

/**
 * Apply a deltaset to a tree, modifying it's commit list
 * to match the changes produced by the thread.
 * 
 * @param thread 
 * @param tree 
 */
const applyDeltaSet = (deltas: DeltaSet, tree: CommitTree) => {
  for (const delta of deltas.created)
    tree.commits.set(delta.ref.id, delta.next);
  
  for (const delta of deltas.skipped)
    tree.commits.set(delta.next.id, delta.next);
  
  for (const delta of deltas.updated)
    tree.commits.set(delta.ref.id, delta.next);
  
  for (const delta of deltas.removed)
    tree.commits.delete(delta.ref.id);
};

export const DeltaSet = {
  create: (): DeltaSet => ({ created: [], updated: [], skipped: [], removed: [] }),
  clone: (deltas: DeltaSet): DeltaSet => ({
    created: [...deltas.created],
    updated: [...deltas.updated],
    skipped: [...deltas.skipped],
    removed: [...deltas.removed],
  }),
  apply: applyDeltaSet,
}


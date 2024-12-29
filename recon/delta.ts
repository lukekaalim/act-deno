import { Commit, CommitRef } from "./commit.ts";

export type CreateDelta = { ref: CommitRef, next: Commit };
export type UpdateDelta = { ref: CommitRef, next: Commit, prev: Commit };
export type RemoveDelta = { ref: CommitRef, prev: Commit };
export type SkipDelta =   { next: Commit };

export type DeltaSet = {
  created: CreateDelta[],
  updated: UpdateDelta[],
  skipped: SkipDelta[],
  removed: RemoveDelta[],
};

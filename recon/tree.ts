import { Commit, CommitID, CommitRef } from "./commit.ts";

export type CommitTree = {
  commits: Map<CommitID, Commit>,
  roots: Set<CommitRef>,
}

export const CommitTree = {
  new: (): CommitTree => ({
    commits: new Map(),
    roots: new Set(),
  }),
  getRootCommits: (tree: CommitTree) => {
    return [...tree.roots].map(ref => tree.commits.get(ref.id) as Commit)
  }
}

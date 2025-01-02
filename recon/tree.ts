import { Commit, CommitID, CommitRef } from "./commit.ts";

export type CommitTree = {
  boundaryValues: Map<CommitID, unknown>,
  commits: Map<CommitID, Commit>,
  roots: Set<CommitRef>,
}

export const CommitTree = {
  new: (): CommitTree => ({
    boundaryValues: new Map(),
    commits: new Map(),
    roots: new Set(),
  }),
  getRootCommits: (tree: CommitTree) => {
    return [...tree.roots].map(ref => tree.commits.get(ref.id) as Commit)
  },
  searchParents(tree: CommitTree, ref: CommitRef, func: (commit: Commit) => boolean): Commit | null {
    for (const id of [...ref.path].reverse()) {
      const commit = tree.commits.get(id) as Commit;
      if (func(commit))
        return commit
    }
    return null;
  }
}

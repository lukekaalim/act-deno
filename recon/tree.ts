import { Commit, CommitID, CommitRef } from "./commit.ts";
import { ContextState } from "./context.ts";
import { ErrorBoundaryState } from "./errors.ts";
import { ComponentState } from "./state.ts";

export type CommitTree = {
  components: Map<CommitID, ComponentState>,
  contexts: Map<CommitID, ContextState<unknown>>,
  errors: Map<CommitID, ErrorBoundaryState>,

  commits: Map<CommitID, Commit>,
  roots: Set<CommitRef>,
}

export const CommitTree = {
  new: (): CommitTree => ({
    errors: new Map(),
    components: new Map(),
    contexts: new Map(),

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

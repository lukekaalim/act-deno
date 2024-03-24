import { act } from "./deps.ts";

/**
 * A single consistent id representing a commit in the act tree.
 * Does not change.
 */
export type CommitID = act.OpaqueID<"CommitID">;
/**
 * A array of **CommitID**'s, starting at the "root" id and "descending"
 * until reaching (including) the subject's ID. Useful for efficiently
 * descending the tree to find a specific change.
 * Does not change.
 */
export type CommitPath = readonly CommitID[];
/**
 * A ID for a particular _state_ a **Commit** is in - every time it or its
 * children change, a commit with the same Id but a new CommitVersion
 * is added to the tree, replacing the previous.
 */
export type CommitVersion = act.OpaqueID<"CommitVersion">;

/**
 * Structure for quick lookup and identification of a commit
 */
export type CommitRef = {
  id: CommitID;
  path: CommitPath;
};

/**
 * Representing an entry in the act "Tree"
 */
export type Commit = CommitRef & {
  version: CommitVersion;
  element: act.Element;
  children: readonly CommitRef[];
};

/**
 * Create a new commit representing a change
 * in a previous commit.
 */
export const updateCommit = (
  ref: CommitRef,
  element: act.Element,
  children: readonly CommitRef[]
): Commit => ({
  ...ref,
  element,
  children,
  version: act.createId(),
});

import { createId, Element, OpaqueID } from "@lukekaalim/act";
import { version } from "os";

/**
 * A single consistent id representing a commit in the act tree.
 * Does not change.
 */
export type CommitID = OpaqueID<"CommitID">;
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
export type CommitVersion = OpaqueID<"CommitVersion">;

/**
 * Structure for quick lookup and identification of a commit
 */
export type CommitRef = {
  id: CommitID;
  path: CommitPath;
};
export const CommitRef = {
  new(path: CommitPath = []) {
    const id = createId<'CommitID'>();
    return {
      path: [...path, id],
      id,
    }
  }
}

/**
 * Representing an entry in the act "Tree"
 */
export type Commit = CommitRef & {
  version: CommitVersion;
  element: Element;
  children: CommitRef[];
};

export const updateCommit = (
  ref: CommitRef,
  element: Element,
  children: CommitRef[]
): Commit => ({
  ...ref,
  element,
  children,
  version: createId(),
});

export const Commit = {
  new(element: Element, path: CommitPath = [], children: CommitRef[] = []): Commit {
    return {
      ...CommitRef.new(path),
      version: createId(),
      children,
      element,
    }
  },
  update: updateCommit,
  version: (commit: Commit): Commit => ({
    ...commit,
    version: createId(),
  }),
}
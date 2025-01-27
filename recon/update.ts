import { convertNodeToElements, createId, Element, Node } from "@lukekaalim/act";
import { calculateChangedElements, ChangeEqualityTest } from "./algorithms.ts";
import { Commit, CommitID, CommitRef } from "./commit.ts";

/**
 * A request to transform part of a tree specified by
 * the "ref"
 */
export type Update = {
  /**
   * The commit that should evaluate this
   * update (if this commit does not exist,
   * it should use this as it's ID and Path).
   * */
  ref: CommitRef;

  /** If null, this update should cause
   * this commit to be created */
  prev: null | Commit;
  /** If null, this update should cause
   * this commit to be removed
   */
  next: null | Element;

  /**
   * List of commits that _must_ re-render as a
   * concequence of this update.
   */
  targets: CommitRef[];

  suspend: boolean,
  moved: boolean,
};

export const Update = {
  fresh: (ref: CommitRef, next: Element): Update => ({
    ref, next, prev: null, targets: [], suspend: false, moved: false,
  }),
  existing: (prev: Commit, next: Element, moved: boolean = false): Update => ({
    ref: prev, next, prev, targets: [], suspend: false, moved,
  }),
  remove: (prev: Commit): Update => ({
    ref: prev, next: null, prev, targets: [], suspend: false, moved: false,
  }),
  distant: (root: Commit, targets: CommitRef[]): Update => ({
    ref: root, next: root.element, prev: root, targets, suspend: false, moved: false,
  }),
  skip: (prev: Commit, targets: CommitRef[]): Update => ({
    ref: prev, next: prev.element, prev, targets, suspend: false, moved: false,
  }),
  target: (prev: Commit): Update => ({
    ref: prev, next: prev.element, prev, targets: [prev], suspend: false, moved: false,
  }),
  suspend: (prev: Commit): Update => ({
    ref: prev, next: prev.element, prev, targets: [], suspend: true, moved: false,
  })
}

/** 
 * Create an update for a single commit and node pair.
 */
export const calculateFastUpdate = (
  parentRef: CommitRef,
  prevCommit: null | Commit,
  element: Element,
): [CommitRef[], Update[]] => {
  const compatible = prevCommit && prevCommit.element.type === element.type;

  const updates: Update[] = [];
  const refs: CommitRef[] = [];

  if (!compatible) {
    const id = createId<"CommitID">();
    const path = [...parentRef.path, id];
    const ref = { id, path };
    updates.push(Update.fresh(ref, element));

    refs.push(ref);
    if (prevCommit)
      updates.push(Update.remove(prevCommit));
  } else if (prevCommit) {
    refs.push(prevCommit);
    updates.push(Update.existing(prevCommit, element));
  }

  return [refs, updates];
};


const simpleElementEqualityTest: ChangeEqualityTest<Commit, Element> = (prev, next, prev_index, next_index) =>
  prev.element.type === next.type && prev_index === next_index;

const keyedElementEqualityTest:  ChangeEqualityTest<Commit, Element> = (prev, next, prev_index, next_index) => {
  const compatible = prev.element.type === next.type;
  if (!compatible)
    return false;
  const prevKey = prev.element.props.key;
  const nextKey = next.props.key;
  if (prevKey || nextKey)
    return prevKey === nextKey;

  return prev_index === next_index;
}

/**
 * Returns a list of all updates that should
 * occur -- given a set of commits and a
 * new node that represents the next state of
 * those commits.
 *
 * Also returns as part of it's tuple the next
 * canonical list of refs, taking into account
 * new commits and removed commits.
 */
export const calculateUpdates = (
  parentRef: CommitRef,
  commits: Commit[],
  node: Node
): [CommitRef[], Update[]] => {
  const elements = convertNodeToElements(node);

  // Fast exit if there is only one node
  if (commits.length <= 1 && elements.length == 1)
    return calculateFastUpdate(parentRef, commits[0], elements[0])

  const change_report = calculateChangedElements(commits, elements, keyedElementEqualityTest);

  const newOrPersisted = elements.map((next, index) => {
    const prevIndex = change_report.nextToPrev[index];
    const prev = prevIndex !== -1 ? commits[prevIndex] : null;

    if (!prev)
      return Update.fresh(CommitRef.new(parentRef.path), next);

    const moved = index === prevIndex;

    return Update.existing(prev, next, moved);
  });
  const removed = change_report.removed.map((index) => {
    const prev = commits[index];
    return Update.remove(prev);
  });
  const updates = [...newOrPersisted, ...removed];

  const refs = newOrPersisted.map((p) => p.ref);
  return [refs, updates];
};

export const isDescendant = (anscestor: CommitRef, descendant: CommitRef) => {
  return descendant.path.includes(anscestor.id);
}
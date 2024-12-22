import { calculateChangedElements, ChangeEqualityTest } from "./algorithms.ts";
import { Commit, CommitID, CommitRef } from "./commit.ts";
import { act } from "./deps.ts";

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
  next: null | act.Element;

  /**
   * List of commits that _must_ re-render as a
   * concequence of this update.
   */
  targets: CommitRef[];
};

export const Update = {
  fresh: (ref: CommitRef, next: act.Element): Update => ({
    ref, next, prev: null, targets: []
  }),
  existing: (ref: CommitRef, prev: Commit | null, next: act.Element): Update => ({
    ref, next, prev, targets: [],
  }),
  remove: (prev: Commit): Update => ({
    ref: prev, next: null, prev, targets: [],
  }),
  distant: (root: Commit, targets: CommitRef[]): Update => ({
    ref: root, next: root.element, prev: root, targets,
  })
}

/** 
 * Create an update for a single commit and node pair.
 */
export const calculateFastUpdate = (
  parentRef: CommitRef,
  prevCommit: null | Commit,
  nextNode: Exclude<act.Node, act.Node[]>
): [CommitRef[], Update[]] => {
  const element = act.convertNodeToElement(nextNode);
  const compatible = prevCommit && prevCommit.element.type === element.type;

  const updates: Update[] = [];
  const refs: CommitRef[] = [];

  if (!compatible) {
    const id = act.createId<"CommitID">();
    const path = [...parentRef.path, id];
    const ref = { id, path };
    updates.push(Update.fresh(ref, element));

    refs.push(ref);
    if (prevCommit)
      updates.push(Update.remove(prevCommit));
  } else if (prevCommit) {
    refs.push(prevCommit);
    updates.push(Update.existing(prevCommit, prevCommit, element));
  }

  return [refs, updates];
};

/**
 * For a set of (prev) commits and a set of (next) elements
 * (plus the parent that they all)
 * belong to, try to associate each commit with an element
 * 
 * @param parent 
 * @param prevCommits 
 * @param nextElements 
 * @returns 
 */
export const findChildCommits = (
  parent: CommitRef,
  prevCommits: Commit[],
  nextElements: act.Element[],
) => {
  const changes = calculateChangedElements(
    prevCommits,
    nextElements,
    (c, e, pi, ni) => c.element.type === e.type && pi === ni,
  );

  const newOrPersisted = nextElements.map((next, index) => {
    const prevIndex = changes.nextToPrev[index];
    const prev = prevIndex !== -1 ? prevCommits[prevIndex] : null;
    if (prev) {
      return { prev, next, ref: prev };
    }
    const id = act.createId<"CommitID">();
    const ref = { id, path: [...parent.path, id] };
    return { prev, next, ref };
  });
  const removed = changes.removed.map((index) => prevCommits[index]);

  return { newOrPersisted, removed };
}

export const calcUpdates = (
  childCommits: ReturnType<typeof findChildCommits>,
  targets: CommitRef[],
): Update[] => {
  return [
    ...childCommits.removed
          // Delete commits dont need targets (they always visit all nodes)
      .map(prev => Update.remove(prev)),
    ...childCommits.newOrPersisted
      .map(({ prev, next, ref }): Update | null => {
        if (!prev) {
          // Create commits dont need targets (they always visit all nodes)
          return { ref, prev, next, targets: [] };
        }
        const validTargets = targets.filter(target => target.path.includes(prev.id));
        if (prev.element.id === next.id && validTargets.length === 0) {
          // dont generate updates for nodes that both:
          //  - havent changed
          //  - dont need their children re-renderered
            return null;
        }
        return { ref: prev, prev, next, targets: validTargets };
      }).filter((x): x is Update => !!x),
  ]
}

const simpleElementEqualityTest: ChangeEqualityTest<Commit, act.Element> = (prev, next, prev_index, next_index) =>
  prev.element.type === next.type && prev_index === next_index;

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
  node: act.Node
): [CommitRef[], Update[]] => {
  const elements = act.convertNodeToElements(node);

  // Fast exit if there is only one node
  if (!Array.isArray(node) && commits.length <= 1 && elements.length == 1) {
    //return calculateFastUpdate(parentRef, commits[0], node)
  }

  const change_report = calculateChangedElements(commits, elements, simpleElementEqualityTest);

  const newOrPersisted = elements.map((next, index) => {
    const prevIndex = change_report.nextToPrev[index];
    const prev = prevIndex !== -1 ? commits[prevIndex] : null;

    const id = (prev && prev.id) || act.createId();
    const path = (prev && prev.path) || [...parentRef.path, id];

    const ref = prev || { id, path };
    return Update.existing(ref, prev, next);
  });
  const removed = change_report.removed.map((index) => {
    const prev = commits[index];
    return Update.remove(prev);
  });
  const updates = [...newOrPersisted, ...removed];

  const refs = newOrPersisted.map((p) => p.ref);
  return [refs, updates];
};

export const isOnTarget = (ref: CommitRef, target: CommitRef) => {

}
import { calculateChangedElements } from "./algorithms.ts";
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
   * List of commits that _must_ re-render.
   */
  targets: CommitRef[];
};

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
    updates.push({ ref, prev: null, next: element, targets: [] });
    refs.push(ref);
    if (prevCommit)
      updates.push({
        ref: prevCommit,
        prev: prevCommit,
        next: null,
        targets: [],
      });
  } else if (prevCommit) {
    refs.push(prevCommit);
    updates.push({
      ref: prevCommit,
      prev: prevCommit,
      next: element,
      targets: [],
    })
  }

  return [refs, updates];
};

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
  const removed = changes.removed.map((index) => {
    const prev = prevCommits[index];
    return { prev, next: null , ref: prev };
  });

  return { newOrPersisted, removed };
}

export const calcUpdates = (
  childCommits: ReturnType<typeof findChildCommits>,
  targets: CommitRef[],
): Update[] => {
  return [
    ...childCommits.removed
          // Delete commits dont need targets (they always visit all nodes)
      .map(({ prev, next }) => ({ ref: prev, next, prev, targets: [] })),
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

/**
 * Returns a list of all updates that should
 * occur -- assuming a set of commits and a
 * new node that represents the next state of
 * those commits.
 *
 * Also returns as part of it's tuple the next
 * canonical list of refs, taking into account
 * new commits and removed commits.
 */
export const calculateUpdates = (
  parentRef: CommitRef,
  prevCommits: Commit[],
  node: act.Node
): [CommitRef[], Update[]] => {
  // Fast exit if there is only one node
  if (!Array.isArray(node) && prevCommits.length <= 1) {
    //return calculateFastUpdate(parentRef, prevCommits[0], node)
  }

  // Otherwise calculate the whole diff.
  const nodes = Array.isArray(node) ? node : [node];
  const elements = nodes.map(act.convertNodeToElement);
  const changes = calculateChangedElements(
    prevCommits,
    elements,
    (c, e, pi, ni) => c.element.type === e.type && pi === ni,
  );
  const newOrPersisted = elements.map((next, index) => {
    const prevIndex = changes.nextToPrev[index];
    const prev = prevIndex !== -1 ? prevCommits[prevIndex] : null;
    const id = (prev && prev.id) || act.createId();
    const path = (prev && prev.path) || [...parentRef.path, id];

    const ref = prev || { id, path };
    return { ref, prev, next, targets: [] };
  });
  const removed = changes.removed.map((index) => {
    const prev = prevCommits[index];
    return { ref: prev, prev, next: null, targets: [] };
  });
  const updates = [...newOrPersisted, ...removed];
  const refs = newOrPersisted.map((p) => p.ref);
  return [refs, updates];
};

export const isOnTarget = (ref: CommitRef, target: CommitRef) => {

}
import { boundaryType, convertNodeToElements, createId, Node } from "@lukekaalim/act";
import { Commit, CommitID, CommitRef } from "./commit.ts";
import { DeltaSet } from "./delta.ts";
import { CommitTree } from "./tree.ts";
import { calculateUpdates, isDescendant, Update } from "./update.ts";
import { ElementService } from "./element.ts";
import { EffectTask } from "./state.ts";

/**
 * A WorkThread is a mutable data struture that
 * represents a particular "Tree Travesal Task".
 * 
 * Its expected when you start rendering, you
 * may start rendering more nodes due to updates.
 */
export type WorkThread = {
  started: boolean,

  pendingUpdates: Update[],
  pendingEffects: EffectTask[],

  boundaryNotifications: Set<CommitID>,

  deltas: DeltaSet,
};
export const WorkThread = {
  new(): WorkThread {
    return {
      started: false,
      pendingEffects: [],
      pendingUpdates: [],
      boundaryNotifications: new Set(),
      deltas: {
        created: [],
        updated: [],
        removed: [],
        skipped: [],
      },
    }
  },
}

export const createThreadManager = (
  elementService: ElementService,
  tree: CommitTree,
  requestWork: () => void,
  onThreadComplete: (deltas: DeltaSet, effects: EffectTask[]) => unknown = _ => {},
) => {
  const pendingUpdateTargets = new Map<CommitID, CommitRef>();

  let currentThread = WorkThread.new();

  const run = () => {
    const update = currentThread.pendingUpdates.pop();
    if (update) {
      applyUpdate(currentThread, update);
    }
  }

  const work = (test: () => boolean) => {
    let tick = 0;

    while (currentThread.pendingUpdates.length > 0) {
      run()
      tick++;

      if (currentThread.pendingUpdates.length === 0) {
        apply();
      }

      // only test every 10 ticks
      if ((tick % 10 === 0) && test()) {
        // early exit
        return false;
      }
    }
    // completed all work
    return true;
  }

  const apply = () => {
    // Update the tree.
    for (const delta of currentThread.deltas.created)
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.skipped)
      tree.commits.set(delta.next.id, delta.next);
    
    for (const delta of currentThread.deltas.updated)
      tree.commits.set(delta.ref.id, delta.next);
    
    for (const delta of currentThread.deltas.removed)
      tree.commits.delete(delta.ref.id);

    for (const boundaryId of currentThread.boundaryNotifications) {
      const commit = tree.commits.get(boundaryId) as Commit;
      const { onValue } = commit.element.props;
      if (typeof onValue === 'function') {
        const clear = () => {
          console.log('clearning boundary and making request')
          elementService.boundary.delete(boundaryId);
          request(commit);
        }
        onValue(elementService.boundary.get(boundaryId), clear);
      }
    }

    // Notify external
    onThreadComplete(currentThread.deltas, currentThread.pendingEffects);

    // clear the thread
    currentThread = WorkThread.new();

    // add any pending work that couldnt be completed last thread
    if (pendingUpdateTargets.size > 0) {
      const roots = CommitTree.getRootCommits(tree);
      const targets = [...pendingUpdateTargets.values()];
      for (const root of roots) {
        currentThread.pendingUpdates.push(Update.distant(root, targets));
      }
      
      pendingUpdateTargets.clear();
    }
  }

  const request = (target: CommitRef) => {
    if (currentThread.started) {
      const updateOnPath = currentThread.pendingUpdates.find(update => {
        return isDescendant(update.ref, target)
      })
      if (updateOnPath) {
        if (updateOnPath.targets.some(target => target.id === target.id)) {
          updateOnPath.targets.push(target);
        }
      } else {
        console.log('adding pending task')
        pendingUpdateTargets.set(target.id, target);
      }
    } else {
      const roots = CommitTree.getRootCommits(tree);
      for (const root of roots) {
        currentThread.started = true;
        currentThread.pendingUpdates.push(Update.distant(root, [target]));
      }
    }

    requestWork();
  }

  const mount = (root: Node) => {
    const elements = convertNodeToElements(root);
    for (const element of elements) {
      const id = createId<"CommitID">();
      const ref = { id, path: [id] };
      tree.roots.add(ref);
      currentThread.pendingUpdates.push(Update.fresh(ref, element));
    }

    requestWork();
  }

  const applyUpdate = (thread: WorkThread, { next, prev, ref, targets, suspend }: Update) => {

    const identicalChange = next && prev && (next.id === prev.element.id);
    const prevChildren = prev && prev.children
      .map(c => tree.commits.get(c.id) as Commit) || [];

    if (suspend && prev) {
      const commit = Commit.suspend(prev);
      const updates = prevChildren.map(prev => Update.suspend(prev))
      thread.deltas.updated.push({ ref: prev, prev: prev, next: commit });
      thread.pendingUpdates.push(...updates);
      return console.log('suspending node', prev);
    }

    if (identicalChange) {
      const isOnTargetPath = targets.some(target => target.path.includes(ref.id));
      if (!isOnTargetPath)
        return console.log('no action', prev.element);

      const isSpecificallyTarget = targets.some(target => target.id === ref.id);

      if (!isSpecificallyTarget) {
        const updates = prevChildren.map(prev => Update.skip(prev, targets));  
        thread.pendingUpdates.push(...updates);
    
        const commit = Commit.version(prev);
        thread.deltas.skipped.push({ next: commit });
        return console.log('skip', prev.element);
      }
    }
    if (next) {
      const output = elementService.render(next, ref);
      const { reject } = output;
      if (reject) {
        if (reject.id === ref.id) {
          const commit = Commit.update(ref, next, )
          thread.deltas.updated.push({ prev });
          return;
        }
        thread.deltas.created = thread.deltas.created.filter(d => !isDescendant(reject, d.ref));
        thread.deltas.updated = thread.deltas.updated.filter(d => !isDescendant(reject, d.ref));
        thread.deltas.removed = thread.deltas.removed.filter(d => !isDescendant(reject, d.ref));
        thread.deltas.skipped = thread.deltas.skipped.filter(d => !isDescendant(reject, d.next));
        thread.pendingUpdates = thread.pendingUpdates.filter(update => !isDescendant(reject, update.ref))
        thread.pendingEffects = thread.pendingEffects.filter(effect => !isDescendant(reject, effect.ref))

        thread.boundaryNotifications.add(reject.id);

        thread.pendingUpdates.push(Update.suspend(reject));
        return console.log('rewinding to boundary', next);
      }
  
      const [childRefs, updates] = calculateUpdates(ref, prevChildren, output.child);

      thread.pendingEffects.push(...output.effects);
      thread.pendingUpdates.push(...updates.map(update => ({
        ...update,
        targets: output.targets.filter(t => isDescendant(update.ref, t))
      })));
  
      const commit = Commit.update(ref, next, childRefs);
  
      if (prev)
        (thread.deltas.updated.push({ ref, prev, next: commit }), console.log('update', commit.element));
      else
        (thread.deltas.created.push({ ref, next: commit }), console.log('create', commit.element));
  
      return;
    }
    else if (prev && !next) {
      const output = elementService.clear(prev);
      thread.deltas.removed.push({ ref: prev, prev });
      thread.pendingUpdates.push(...prevChildren.map(prev => Update.remove(prev)));
      thread.pendingEffects.push(...output.effects);
      return console.log('remove', prev.element);
    } else {
      throw new Error(`No prev, no next, did this commit ever exist?`)
    }
  };

  return { work, request, mount }
};

export type ThreadManager = ReturnType<typeof createThreadManager>;

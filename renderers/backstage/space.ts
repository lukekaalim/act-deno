import * as act from '@lukekaalim/act';
import * as recon from '@lukekaalim/act-recon';

/**
 * A "RenderSpace" is a service that manages
 * a subtree of a particular type (T). Its broken
 * down into two phases, "create" & "configure".
 * 
 * This needs to be done in two phases, because
 * often configuring elements requires references to
 * children and parents, and if they haven't been
 * created yet (or if the order of their creation is
 * uncertain), then these functions cant act properly.
 * 
 * #### Create
 * The create phase is responsible for the assignment
 * of CommitIds to T.
 * 
 * #### Configure
 * This is where props are assigned, and children +
 * heirarchial elements can be setup.
 */
export type RenderSpace = {
  create(deltas: recon.DeltaSet): { configure: () => unknown },
};

export type SimpleRenderSpaceArgs<T, R extends string | Symbol> = {
  rootTypes: Set<R>,

  create: (element: act.Element, rootType: R) => null | T,
  link?: (el: T, parent: null | T) => unknown,
  unlink?: (el: T, parent: null | T) => unknown,

  sort?: (el: T, children: readonly T[]) => unknown,
  update?: (el: T, next: act.Element, prev: null | act.Element) => unknown,
  destroy?: (el: T) => unknown, 
};

export type NodeRef<T> = {
  id: recon.CommitID,
  node: T,
}

export const createSimpleRenderSpace = <T, R extends string | Symbol>(
  tree: recon.CommitTree,
  args: SimpleRenderSpaceArgs<T, R>,
  nodeByCommit: Map<recon.CommitID, T | null> = new Map(),
): RenderSpace => {
  const commitByNode = new Map<T, recon.CommitID>();

  const rootIds = new Set<recon.CommitID>();

  /**
   * Find all the nodes that belong children (in commit order!)
   * for a particular commit.
   */
  const findChildren = (id: recon.CommitID, ignoreFirst = false): readonly T[] => {
    const node = nodeByCommit.get(id);
    if (node && !ignoreFirst)
      return [node];
    const commit = tree.commits.get(id);
    if (!commit || commit.suspended)
      return [];
    if (commit.element.type === act.primitiveNodeTypes.null)
      return [];
    return commit.children.map(c => findChildren(c.id)).flat(1);
  };
  const findParent = (ref: recon.CommitRef): null | NodeRef<T | null> => {
    for (let i = 1; i < ref.path.length; i++) {
      const id = ref.path[ref.path.length - i - 1];

      const commit = tree.commits.get(id) as recon.Commit;
      // Early exit out of parent lookup if someone on the path is null;
      if (commit.element.type === act.primitiveNodeTypes.null)
        return { id, node: null };

      const node = nodeByCommit.get(id);
      // If you find an element with a node
      if (node)
        return { id, node }
    }
    // this element has no parents - it is probably a "root" commit
    return null;
  }
  const findRootId = (ref: recon.CommitRef) => {
    for (let i = ref.path.length - 1; i >= 0; i--) {
      const id = ref.path[i];
      if (rootIds.has(id))
        return id;
    }
    return null;
  }

  const space: RenderSpace =  {
    create(deltas) {
      const newNodes: Set<{ delta: recon.CreateDelta, node: T }> = new Set();
      const needsReorder = new Set<recon.CommitID>();

      for (const delta of deltas.created) {
        if (delta.next.element.type === act.renderNodeType) {
          // add render boundary
          rootIds.add(delta.ref.id);
          continue;
        }
        const rootId = findRootId(delta.ref);
        const root = rootId && tree.commits.get(rootId) || null;
        if (!root)
          continue;

        const rootType = root.element.props['type'] as R;

        // test to see if this element
        // belongs to this 
        if (args.rootTypes.has(rootType) ) {
          // Try to create a <T> for every new commit
          const node = args.create(delta.next.element, rootType);
          // Not all commits have a corresponding node
          if (node) {
            newNodes.add({ node, delta });
            nodeByCommit.set(delta.ref.id, node);
            commitByNode.set(node, delta.ref.id)
          }
        }

      }

      return {
        configure() {
          if (args.link || args.sort) {
            // Loop through newly created nodes
            for (const { delta, node } of newNodes) {
              const parent = findParent(delta.ref);
              const parentNode = parent && parent.node;
              if (parentNode) {
                needsReorder.add(parent.id)
              }
              if (args.link && (!parent || parentNode)) {
                args.link(node, parentNode);
              }
            }
          }

          if (args.update) {
            for (const delta of deltas.updated) {
              const node = nodeByCommit.get(delta.ref.id);
              if (!node)
                continue;
              args.update(node, delta.next.element, delta.prev.element);

              if (delta.prev.suspended !== delta.next.suspended) {
                const parent = findParent(delta.ref);
                const parentNode = parent && parent.node;
                if (parentNode) {
                  needsReorder.add(parent.id)
                }
                console.log('altering suspention type', node, parentNode, delta.next)
                if (!parent || parentNode) {
                  if (!delta.next.suspended && args.link)
                    args.link(node, parentNode);
                  if (delta.next.suspended && args.unlink)
                    args.unlink(node, parentNode);
                }
              }
            }
            for (const delta of deltas.created) {
              const node = nodeByCommit.get(delta.ref.id);
              if (node)
                args.update(node, delta.next.element, null);
            }
          }
          for (const delta of deltas.removed) {
            const prevResult = nodeByCommit.get(delta.ref.id);
            if (prevResult) {
              nodeByCommit.delete(delta.ref.id);
              const parentId = delta.ref.path.find(id => nodeByCommit.get(id));
              if (parentId)
                needsReorder.add(parentId)

              commitByNode.delete(prevResult);
              if (args.destroy)
                args.destroy(prevResult);
            }
          }

          if (args.sort) {
            for (const id of needsReorder) {
              const node = nodeByCommit.get(id);
              if (node) {
                const children = findChildren(id, true);
                args.sort(node, children);
              }
            }
          }
        },
      }
    },
  }

  return space;
};




export const RenderSpace = {
  combine(subspaces: RenderSpace[]) {
    const create = (deltas: recon.DeltaSet) => {
      const results = subspaces.map(ss => ss.create(deltas));
  
      const configure = () => {
        results.map(result => result.configure());
      }
      return { configure }
    };
  
    return { create };
  },
  simple: createSimpleRenderSpace
}
import { recon, act } from "./deps.ts";

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
  create(
    deltas: recon.Delta[],
    commits: Map<recon.CommitID, recon.Commit>,
  ): { configure: () => unknown },
};

export type SimpleRenderSpaceArgs<T> = {
  create: (element: act.Element) => null | T,
  link?: (el: T, parent: null | T) => unknown,
  sort?: (el: T, children: readonly T[]) => unknown,
  update?: (el: T, next: act.Element, prev: null | act.Element) => unknown,
  destroy?: (el: T) => unknown, 
};

export type NodeRef<T> = {
  id: recon.CommitID,
  node: T,
}

export const createSplitRenderSpace = <T>(
  subspaces: RenderSpace[],
): RenderSpace => {
  const create = (deltas: recon.Delta[], commits: Map<recon.CommitID, recon.Commit>) => {
    const results = subspaces.map(ss => ss.create(deltas, commits));
    const configure = () => {
      results.map(result => result.configure());
    }
    return { configure }
  };

  return { create };
}

export const multi = createSplitRenderSpace;

export const createSimpleRenderSpace = <T>(
  args: SimpleRenderSpaceArgs<T>,
): RenderSpace => {
  const nodeByCommit = new Map<recon.CommitID, T | null>();
  const commitByNode = new Map<T, recon.CommitID>();


  return {
    create(deltas, commits) {
      const findChildren = (id: recon.CommitID, ignoreFirst = false): readonly T[] => {
        const node = nodeByCommit.get(id);
        if (node && !ignoreFirst)
          return [node];
        const commit = commits.get(id);
        if (!commit)
          return [];
        return commit.children.map(c => findChildren(c.id)).flat(1);
      };
      const findParent = (ref: recon.CommitRef): null | NodeRef<T> => {
        const id = [...ref.path].reverse().find((id, i) => i !== 0 && nodeByCommit.get(id));
        const node = id && nodeByCommit.get(id);
        if (!node || !id)
          return null;
        return { id, node };
      }

      const newNodes: Set<{ delta: recon.Delta, node: T }> = new Set();
      const needsReorder = new Set<recon.CommitID>();

      for (const delta of deltas) {
        if (delta.next && !delta.prev) {
          // Try to create a <T> for every new commit
          const node = args.create(delta.next.element);
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
              if (delta.next && !delta.prev) {
                const parent = findParent(delta.ref);
                if (parent) {
                  needsReorder.add(parent.id)
                }
                if (args.link)
                  args.link(node, parent ? parent.node : null);
              }
            }
          }
          for (const delta of deltas) {
            if (delta.next && args.update) {
              // Update
              const prevResult = nodeByCommit.get(delta.ref.id);
              if (prevResult)
                args.update(prevResult, delta.next.element, delta.prev ? delta.prev.element : null);
            }
            if (!delta.next && delta.prev) {
              // Delete
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
};

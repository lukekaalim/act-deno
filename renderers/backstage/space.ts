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
export type RenderSpace<T> = {
  create(deltas: recon.Delta[]): unknown,
  configure(deltas: recon.Delta[]): unknown,
  
};


export type SimpleRenderSpaceArgs<T> = {
  create: (element: act.Element) => null | T,
  update?: (prev: T, element: act.Element) => void,
  destroy?: (prev: T) => void, 
};

export const createSimpleRenderSpace = <T>(
  args: SimpleRenderSpaceArgs<T>
): RenderSpace<T> => {
  const nodeByCommit = new Map<recon.CommitID, T | null>();
  const commitByNode = new Map<T, recon.CommitID>();

  return {
    create(deltas) {
      for (const delta of deltas) {
        if (delta.next) {
          const node = args.create(delta.next.element);
          if (node) {
            nodeByCommit.set(delta.ref.id, node);
            commitByNode.set(node, delta.ref.id)
          }
        }
      }
    },
    configure(deltas) {
      for (const delta of deltas) {
        if (delta.next && delta.prev && args.update) {
          const prevResult = nodeByCommit.get(delta.ref.id);
          if (prevResult)
            args.update(prevResult, delta.next.element);
        }
        if (!delta.next && delta.prev) {
          const prevResult = nodeByCommit.get(delta.ref.id);
          nodeByCommit.delete(delta.ref.id);
          if (prevResult) {
            commitByNode.delete(prevResult);
            if (args.destroy)
              args.destroy(prevResult);
          }
        }
      }
    },
  }
};

import { CommitTree, createReconciler } from "@lukekaalim/act-recon";
import { RenderSpace } from "./space";
import * as act from '@lukekaalim/act';

export type ScheduleRequestFunc<ID> = (callback: () => void) => ID;
export type ScheduleCancelFunc<ID> = (id: ID) => void;

export type Scheduler<ID> = {
  duration: number,

  request: ScheduleRequestFunc<ID>,
  cancel: ScheduleCancelFunc<ID>,
}

export type RenderFunction<T> = (node: act.Node, root: T) => { stop: () => void }

export const createRenderFunction = <S, T>(
  scheduler: Scheduler<S>,
  createSpace: (tree: CommitTree, root: T) => RenderSpace
): RenderFunction<T> => {
  const render: RenderFunction<T> = (node: act.Node, root: T) => {
    const reconciler = createReconciler();

    reconciler.on('render', thread => {
      space.create(thread.deltas).configure();
    })
    let pendingWork = false;
    let timeoutId: number | null = null;
    reconciler.on('request-work', () => {
      pendingWork = true;
      if (!timeoutId)
        timeoutId = setTimeout(work, 1);
    })
    const work = () => {
      timeoutId = null;
      // sync worker
      while (pendingWork) {
        pendingWork = false;
        reconciler.work();
      }
    }

    const space = createSpace(reconciler.tree, root);
    
    reconciler.scheduler.mount(node);

    return {
      stop() {
      },
    }
  };

  return render;
}
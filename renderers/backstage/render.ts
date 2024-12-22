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
    const reconciler = createReconciler(deltas => {
      space.create(deltas).configure();
    }, () => {
      scheduler.cancel(id);
      id = scheduler.request(work)
    });

    const space = createSpace(reconciler.tree, root);
    
    const work = () => {
      const start = performance.now();
      const end = start + scheduler.duration;
      const done = reconciler.threads.work(() => {
        const now = performance.now();
        return now >= end;
      })
      if (done) {
        scheduler.cancel(id)
      }
    }

    let id = scheduler.request(work);
    
    reconciler.threads.mount(node);

    return {
      stop() {
        scheduler.cancel(id);
      },
    }
  };

  return render;
}
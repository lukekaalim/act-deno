import { WorkThread } from "./thread";
import { CommitTree } from "./tree";
import { DeltaSet } from "./delta";
import { createElementService, ElementService } from "./element";
import { createScheduler, Scheduler } from "./scheduler";
import { createId, OpaqueID } from "@lukekaalim/act";

export type Subscription = { cancel: () => void };
export type RenderHandler = (thread: WorkThread) => unknown;
export type WorkHandler = () => unknown;
export type RequestWorkHandler = () => unknown;

export type Reconciler = {
  tree: CommitTree,
  elements: ElementService,
  scheduler: Scheduler,

  work: () => void,

  on(event: 'request-work', handler: RequestWorkHandler): Subscription,
  on(event: 'start-work', handler: WorkHandler): Subscription,
  on(event: 'complete-work', handler: WorkHandler): Subscription,
  on(event: 'thread-queued', handler: WorkHandler): Subscription,
  on(event: 'render', handler: RenderHandler): Subscription,
};

/**
 * A reconciler links all the relevant subsystems together.
 * 
 * @param space 
 * @param onAfterRender 
 * @returns 
 */
export const createReconciler = (): Reconciler => {
  const tree = CommitTree.new();
  const elements = createElementService(tree, ref => scheduler.render(ref));

  const onThreadComplete = (thread: WorkThread) => {
    for (const [,handler] of handlers.render)
      handler(thread);
    
    // immediately execute all side effects
    for (const effect of thread.pendingEffects)
      effect.func();
  }
  const onThreadQueued = () => {
    for (const [,handler] of handlers["thread-queued"])
      handler();
  }

  const tasks = new Set<() => void>();

  // TODO: better "work" abstraction needed
  const scheduler = createScheduler(tree, elements, (workFunc) => {
    tasks.add(workFunc);

    for (const [,handler] of handlers["request-work"])
      handler();

    return { cancel() { } }
  }, onThreadComplete, onThreadQueued)


  const handlers = {
    render: new Map<OpaqueID<'HandlerID'>, RenderHandler>(),
    work: new Map<OpaqueID<'HandlerID'>, WorkHandler>(),
    'request-work': new Map<OpaqueID<'HandlerID'>, WorkHandler>(),
    'start-work': new Map<OpaqueID<'HandlerID'>, WorkHandler>(),
    'complete-work': new Map<OpaqueID<'HandlerID'>, WorkHandler>(),
    'thread-queued': new Map<OpaqueID<'HandlerID'>, WorkHandler>(),
  }
  const on = (event: 'render' | 'complete-work' | 'schedule' | 'request-work' | 'thread-queued', handler: RenderHandler | WorkHandler | ScheduleHandler) => {
    const id = createId<'HandlerID'>();
    switch (event) {
      case 'render':
        handlers[event].set(id, handler as RenderHandler);
        break;
      case 'complete-work':
        handlers[event].set(id, handler as WorkHandler);
        break;
      case 'request-work':
        handlers[event].set(id, handler as WorkHandler);
        break;
      case 'thread-queued':
        handlers[event].set(id, handler as WorkHandler);
        break;
      default:
        throw new Error();
    }    
    return { cancel: () => {
      handlers[event].delete(id);
    } }
  }
  const work = () => {
    for (const task of tasks)
      task();

    for (const [,handler] of handlers["complete-work"])
      handler();
  }

  return {
    scheduler,
    elements,
    tree,

    work,
    on,
  }
}

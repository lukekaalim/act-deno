export type WorkRequestFunc<ID> = (callback: () => void) => ID;
export type WorkCancelFunc<ID> = (id: ID) => void;

/**
 * A work manger is a service 
 */
export type WorkManager<ID> = {
  request: WorkRequestFunc<ID>,
  cancel: WorkCancelFunc<ID>,
}
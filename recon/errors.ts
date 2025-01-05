import { CommitID } from "./commit"

export type ErrorBoundaryState = {
  id: CommitID,
  state: 'error' | 'normal',
  value: unknown,
}

export const ErrorBoundaryState = {
  create(id: CommitID): ErrorBoundaryState {
    return { id, value: null, state: 'normal' };
  },
  clear(state: ErrorBoundaryState) {
    state.state = 'normal';
  },
  set(state: ErrorBoundaryState, value: unknown) {
    state.state = 'error';
    state.value = value;
  }
}
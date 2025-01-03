import { CommitID } from "./commit"

export type ErrorBoundaryState = {
  id: CommitID,
  poisons: Map<CommitID, unknown>,
}

export const ErrorBoundaryState = {
  create(id: CommitID): ErrorBoundaryState {
    return { id, poisons: new Map() };
  }
}
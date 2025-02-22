import { Component, ElementType, Ref } from "./mod";

export const errorBoundaryType = Symbol('error-boundary');

export type ErrorBoundaryProps = {
  onError?: (value: unknown) => unknown,
  ref?: Ref<null | { clear: () => void }>
}

export const ErrorBoundary: Component<ErrorBoundaryProps> = errorBoundaryType as any;

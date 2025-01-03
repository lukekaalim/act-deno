import { Component, ElementType } from "./mod";

export const errorBoundaryType = Symbol('error-boundary');

export type ErrorBoundaryProps = {
  onError: (value: unknown, clear: () => void) => unknown,
}

export const ErrorBoundary: Component<ErrorBoundaryProps> = errorBoundaryType as any;

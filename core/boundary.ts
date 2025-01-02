import { Component, ElementType } from "./mod";

export const boundaryType = Symbol('boundary');

export type BoundaryProps = {
  onValue: (value: unknown, clear: () => void) => unknown,
}

export const Boundary: Component<BoundaryProps> = boundaryType as any;
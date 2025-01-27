import { Node } from "./node.ts";

export type Props = Record<string, unknown>;
export type EmptyProps = Record<string, never>;

/**
 * A Component, the building block of UI. Recieves props,
 * and before being called has it's ComponentState setup so
 * it can call Hooks.
 *
 * Should not be called directly, instead pass it to
 * createElement as the first argument.
 */
export type Component<T extends Props = EmptyProps> = (
  props: T & { children: Node, key?: string }
) => Node;

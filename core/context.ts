import { Component } from "./component.ts";
import { MagicError } from "./errors.ts";
import { OpaqueID, createId } from "./id.ts";

export type ContextID = OpaqueID<"ContextID">;
export type Context<T> = {
  Provider: Component<{ value: T }>,
  defaultValue: T,
  id: ContextID,
}

export const providerNodeType = Symbol("provider-node");

export const createContext = <T>(defaultValue: T): Context<T> => {
  throw new MagicError();
};

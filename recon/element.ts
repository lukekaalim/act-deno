import { Element, primitiveNodeTypes } from "@lukekaalim/act";
import { CommitRef } from "./commit";
import { EffectTask } from "./effects";
import { ComponentService } from "./component";

/**
 * When processing an element, it may produce additional
 * pieces of information: new targets, side effects, and boundary
 * values
 */
export type ElementOutput = {
  child: Node,
  boundary: null | unknown,
  effects: null | EffectTask[],
  targets: null | CommitRef[],
};

export const renderElement = (element: Element, ref: CommitRef, comp: ComponentService): ElementOutput => {
  switch (typeof element.type) {
    case 'string':
    case 'symbol':
      switch (element.type) {
        
      }
    case 'function':
    default:
      return output
  }
}
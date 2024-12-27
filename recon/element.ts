import { Element, Node, primitiveNodeTypes, providerNodeType } from "@lukekaalim/act";
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
      return { child: element.children, boundary: null, effects: null, targets: null }
    case 'symbol':
      switch (element.type) {
        case providerNodeType:
          const targets = comp.context.processContextElement(element, ref.id);
          if (targets)
            return { child: element.children, boundary: null, effects: null, targets }
        default:
          return { child: element.children, boundary: null, effects: null, targets: null }
      }
    case 'function':
      comp.state.calculateCommitChildren();
    default:
      return output
  }
}
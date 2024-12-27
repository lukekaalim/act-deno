import { Element } from "./element.ts";
import { UnknownElementType } from "./errors.ts";
import { h } from "./element.ts";

export type Node =
  | string
  | number
  | boolean
  | null
  | Element
  | Node[]

export const primitiveNodeTypes = {
  string:   Symbol("string-node"),
  number:   Symbol("number-node"),
  boolean:  Symbol("boolean-node"),
  null:     Symbol("null-node"),
  array:    Symbol("array-node"),
} as const;

/**
 * Any node tree represents one or more elements
 */
export const convertNodeToElements = (node: Node): Element[] => {
  const nodeArray = Array.isArray(node) ? node : [node];

  return nodeArray.map(node => {
    switch (typeof node) {
      case 'boolean':
        return h(primitiveNodeTypes.boolean, { value: node });
      case 'number':
        return h(primitiveNodeTypes.number, { value: node });
      case 'string':
        return h(primitiveNodeTypes.string, { value: node });
  
      case 'object': 
        if (node === null)
          return h(primitiveNodeTypes.null);
        if (Array.isArray(node))
          return h(primitiveNodeTypes.array, {}, node);
        
        return node;
      case 'symbol':
        return node;
      case 'undefined':
        throw new Error(`Undefined is not a valid act element!`);
      default:
        throw new UnknownElementType()
    }
  })
}
import { Element, primitiveNodeTypes } from "@lukekaalim/act";

export const getElementName = (element: Element) => {
  if (typeof element.type === 'function')
    return `<${element.type.name}>`;
  if (typeof element.type === 'symbol')
    switch (element.type) {
      case primitiveNodeTypes.number:
        return `<number value={${element.props.value}}>`
      case primitiveNodeTypes.string:
        return `<string value="${element.props.value}">`
      case primitiveNodeTypes.boolean:
        return `<boolean value="${element.props.value}">`
      case primitiveNodeTypes.array:
        return `<array>`
      case primitiveNodeTypes.null:
        return `<null>`
      default:
        return `<symbol>`
    }
  if (element.type)
    return `<${element.type}>`;
  return '<none>';
}
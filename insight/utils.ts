import { Element, primitiveNodeTypes, providerNodeType, renderNodeType } from "@lukekaalim/act";

export const getElementName = (element: Element) => {
  if (typeof element.type === 'function')
    return `<component(${element.type.name})>`;
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
      case renderNodeType:
        return `<render type="${element.props.type}">`;
      case providerNodeType:
        return `<context id="${element.props.id}">`;
      default:
        return `<symbol>`
    }
  if (element.type)
    return `<${element.type}>`;
  return '<none>';
}
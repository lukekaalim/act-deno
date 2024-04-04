import ts from "typescript";
import { TypeInfo } from "../write";

export const createTypeInfoTypeNode = (type: TypeInfo) => {
  switch (type.tagName) {
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createTypeReferenceNode(type.name);
    case 'GI_TYPE_TAG_ERROR':
      return ts.factory.createTypeReferenceNode('Error');
    case 'GI_TYPE_TAG_UINT8':
    case 'GI_TYPE_TAG_UINT16':
    case 'GI_TYPE_TAG_UINT32':
    case 'GI_TYPE_TAG_INT8':
    case 'GI_TYPE_TAG_INT16':
    case 'GI_TYPE_TAG_INT32':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'GI_TYPE_TAG_BOOLEAN':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case 'GI_TYPE_TAG_INT64':
    case 'GI_TYPE_TAG_UINT64':
      return ts.factory.createUnionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      ])
    case 'GI_TYPE_TAG_UTF8':
      return ts.factory.createUnionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      ])
    case 'GI_TYPE_TAG_VOID':
    default:
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
  }
}
export const createJSValueToInteropNode = (typeInfo: TypeInfo, jsValue: ts.Expression) => {
  switch (typeInfo.tagName) {
    default:
      return jsValue;
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createPropertyAccessExpression(jsValue, "pointer")
  }
};

export const createInteropToJSValueNode = (typeInfo: TypeInfo, interopValue: ts.Expression) => {
  switch (typeInfo.tagName) {
    default:
      return interopValue;
    case 'GI_TYPE_TAG_ERROR':
      return ts.factory.createNewExpression(
        ts.factory.createIdentifier('Error'),
        [],
        [interopValue]
      );
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createNewExpression(
        ts.factory.createIdentifier(typeInfo.name),
        [],
        [interopValue]
      );
  }
}
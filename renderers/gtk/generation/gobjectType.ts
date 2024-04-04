import ts from "typescript";
import { TypeInfo } from "../write";

export const createTypeInfoTypeNode = (type: TypeInfo) => {
  switch (type.tagName) {
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createTypeReferenceNode(type.name);
    case 'GI_TYPE_TAG_UINT32':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'GI_TYPE_TAG_BOOLEAN':
      return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
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
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createNewExpression(
        ts.factory.createIdentifier(typeInfo.name),
        [],
        [interopValue]
      );
  }
}
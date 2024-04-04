import ts from "typescript";
import { NamespaceInfo, ObjectInfo, StructInfo } from "../write";
import { createFFIFunctionSignatureNode } from "./ffiSignature";

export const createFFILibraryNode = (namespace: NamespaceInfo) => {
  if (!namespace.lib)
    return null;

  const objects: ObjectInfo[] = [];
  const structures: StructInfo[] = [];

  for (const info of namespace.infos) {
    if (info.type === 'GI_INFO_TYPE_OBJECT')
      objects.push(info.object)
    else if (info.type === 'GI_INFO_TYPE_STRUCT')
      structures.push(info.struct)
  }

  const allFunctions = [
    objects.map(o => o.methods),
    structures.map(s => s.methods),
  ].flat(2);

  const sharedObjectName = namespace.lib.split(',')[0];

  return ts.factory.createNewExpression(
    ts.factory.createIdentifier('Library'),
    [],
    [
      ts.factory.createStringLiteral('/opt/homebrew/lib/' + sharedObjectName),
      ts.factory.createObjectLiteralExpression(
        allFunctions
          .map(func => {
            if (!func.symbol)
              return null;
            return ts.factory.createPropertyAssignment(func.symbol, createFFIFunctionSignatureNode(func))
          })
          .filter((f): f is ts.PropertyAssignment => !!f),
        true
      )
    ]
  )
}
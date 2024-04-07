import ts from "typescript";
import { NamespaceInfo, StructInfo } from "../write";
import { createFFIFunctionSignatureNode } from "./ffiSignature";
import { NamespaceLookup, NamespaceMap, TypeProvider } from "../infos/namespace";
import { ObjectInfo } from "../infos/object";

const skipSymbols = new Set(["g_io_module_query"]);

export const createFFILibraryNode = (namespace: NamespaceLookup, types: TypeProvider) => {
  if (!namespace.info.lib)
    return null;

  const allFunctions = [
    namespace.objects.map(o => o.abstract ? [] : o.methods),
    namespace.structs.map(s => s.methods),
    namespace.functions,
  ].flat(2).filter(f => f.symbol && !skipSymbols.has(f.symbol));

  const sharedObjectName = namespace.info.lib.split(',')[0];

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
            return ts.factory.createPropertyAssignment(func.symbol, createFFIFunctionSignatureNode(func, types))
          })
          .filter((f): f is ts.PropertyAssignment => !!f),
        true
      )
    ]
  )
}
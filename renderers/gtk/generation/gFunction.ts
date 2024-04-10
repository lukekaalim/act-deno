import ts from "typescript";
import { TypeProvider } from "../infos/namespace";
import { FunctionInfo, StructInfo } from "../write";

export const createFunctionNode = (namespace: string, funcInfo: FunctionInfo, types: TypeProvider) => {
  const callNativeFunctionNode = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), funcInfo.symbol || ''),
    [],
    funcInfo.args
      .map(a => types.createJSValueToInteropNode(a.type, ts.factory.createIdentifier(processFuncName(a.name))))
  );

  const body = ts.factory.createBlock([
    ts.factory.createReturnStatement(
      types.createInteropToJSValueNode(
        funcInfo.returnType,
        callNativeFunctionNode
    )),
  ], true);

  const func = ts.factory.createFunctionDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    processFuncName(funcInfo.name),
    [],
    funcInfo.args.map(arg => ts.factory.createParameterDeclaration(
      [],
      undefined,
      processFuncName(arg.name),
      undefined,
      types.getTypeNodeForType(arg.type),
    )),
    types.getTypeNodeForType(funcInfo.returnType),
    body,
  );

  return func;
};

const evilNames = new Set([
  'function',
  'arguments',
  'eval',
  'in',
  'out',
  'break',
  'continue',
  'return',
])

export const processFuncName = (name: string) => {
  if (evilNames.has(name))
    return '_' + name;
  
  return name;
}
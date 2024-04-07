import ts from "typescript";
import { TypeProvider } from "../infos/namespace";
import { FunctionInfo, StructInfo } from "../write";

export const createFunctionNode = (namespace: string, funcInfo: FunctionInfo, types: TypeProvider) => {
  const callNativeFunctionNode = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), funcInfo.symbol || ''),
    [],
    funcInfo.args
      .map(a => types.createJSValueToInteropNode(a.type, ts.factory.createIdentifier(processName(a.name))))
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
    funcInfo.name,
    [],
    funcInfo.args.map(arg => ts.factory.createParameterDeclaration(
      [],
      undefined,
      processName(arg.name),
      undefined,
      types.getTypeNodeForType(namespace, arg.type),
    )),
    types.getTypeNodeForType(namespace, funcInfo.returnType),
    body,
  );

  return func;
};

export const processName = (name: string) => {
  switch (name) {
    case 'function':
      return '_function';
    case 'arguments':
      return '_arguments';
    case 'eval':
      return '_eval';
    default:
      return name;
  }
}
import ts from "typescript";
import { FunctionInfo, StructInfo } from "../write";
import { createInteropToJSValueNode, createJSValueToInteropNode, createTypeInfoTypeNode } from "./gobjectType";

export const createGObjectStructNode = (namespace: string, struct: StructInfo) => {
  const staticMethods = [
    struct.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_CONSTRUCTOR"))
  ].flat(1);

  const instanceFunctions = [
    struct.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_METHOD"))
  ].flat(1).map(func => createGStructMethod(namespace, struct, func));

  const modifiers = [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)
  ]
  const name = struct.name;

  const staticMembers = staticMethods.map(method => ts.factory.createMethodDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.StaticKeyword)],
    undefined,
    method.name,
    undefined,
    [],
    method.args.map(arg => ts.factory.createParameterDeclaration(
      [],
      undefined,
      arg.name,
      undefined,
      createTypeInfoTypeNode(arg.type),
    )),
    createTypeInfoTypeNode(method.returnType),
    createGStructConstructorBody(namespace, struct, method),
  ))

  const unknownPointerType = ts.factory.createTypeReferenceNode(
    ts.factory.createQualifiedName(ts.factory.createIdentifier('ref'), "Pointer"),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)]
  );

  const privateConstructor = ts.factory.createConstructorDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
    [ts.factory.createParameterDeclaration([], undefined, "pointer", undefined, unknownPointerType)],
    ts.factory.createBlock([
      ts.factory.createExpressionStatement(
        ts.factory.createAssignment(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createThis(),
            "pointer"
          ),
          ts.factory.createIdentifier("pointer")
        )
      )
    ]),
  );

  const fields = [
    ts.factory.createPropertyDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
      'pointer', undefined, unknownPointerType,
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('ref'), 'NULL')
    ),
  ];

  const members = [
    fields,
    privateConstructor,

    staticMembers,
    instanceFunctions,
  ].flat(1)

  return ts.factory.createClassDeclaration(modifiers, name, [], [], members);
};

export const createGStructConstructorBody = (namespace: string, struct: StructInfo, func: FunctionInfo) => {
  if (!func.symbol) {
    return ts.factory.createBlock([
      ts.factory.createThrowStatement(
        ts.factory.createNewExpression(
          ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('global'), 'Error'),
          [],
          [ts.factory.createStringLiteral(`Can't find symbol for ${struct.name}.${func.name}`)]
        )
      )
    ])
  }

  const callLibFunctionNode = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), func.symbol || ''),
    [],
    func.args.map(arg => createJSValueToInteropNode(arg.type, ts.factory.createIdentifier(arg.name)))
  )

  const createInstanceNode = ts.factory.createNewExpression(
    ts.factory.createIdentifier(struct.name),
    [],
    [callLibFunctionNode]
  );
  
  return ts.factory.createBlock([
    ts.factory.createReturnStatement(createInstanceNode),
  ], true)
}

export const createGStructMethod = (namespace: string, struct: StructInfo, func: FunctionInfo) => {
  const body = ts.factory.createBlock([
    ts.factory.createReturnStatement(createInteropToJSValueNode(func.returnType, ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), func.symbol || ''),
      [],
      [
        ts.factory.createPropertyAccessExpression(ts.factory.createThis(), "pointer"),
        ...func.args.map(a => createJSValueToInteropNode(a.type, ts.factory.createIdentifier(processName(a.name))))
      ],
    ))),
  ], true);

  return ts.factory.createMethodDeclaration(
    [],
    undefined,
    processName(func.name),
    undefined,
    [],
    func.args.map(arg => ts.factory.createParameterDeclaration(
      [],
      undefined,
      processName(arg.name),
      undefined,
      createTypeInfoTypeNode(arg.type),
    )),
    createTypeInfoTypeNode(func.returnType),
    body,
  )
}

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
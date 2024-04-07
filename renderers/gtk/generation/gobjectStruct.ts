import ts from "typescript";
import { FunctionInfo, StructInfo } from "../write";
import { TypeProvider } from "../infos/namespace";

export const createGObjectStructNode = (namespace: string, struct: StructInfo, types: TypeProvider) => {
  const staticMethods = [
    struct.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_CONSTRUCTOR"))
  ].flat(1);

  const instanceFunctions = [
    struct.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_METHOD"))
  ].flat(1).map(func => createGStructMethod(namespace, struct, func, types));

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
      types.getTypeNodeForType(namespace, arg.type),
    )),
    types.getTypeNodeForType(namespace, method.returnType),
    createGStructConstructorBody(namespace, struct, method, types),
  ))

  const unknownPointerType = ts.factory.createTypeReferenceNode(
    ts.factory.createQualifiedName(ts.factory.createIdentifier('ref'), "Pointer"),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)]
  );

  const privateConstructor = ts.factory.createConstructorDeclaration(
    [],
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
      [],
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

export const createGStructConstructorBody = (namespace: string, struct: StructInfo, func: FunctionInfo, types: TypeProvider) => {
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
    func.args.map(arg => types.createJSValueToInteropNode(arg.type, ts.factory.createIdentifier(arg.name)))
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

export const createGStructMethod = (namespace: string, struct: StructInfo, func: FunctionInfo, types: TypeProvider) => {
  const body = ts.factory.createBlock([
    ts.factory.createReturnStatement(types.createInteropToJSValueNode(func.returnType, ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), func.symbol || ''),
      [],
      [
        ts.factory.createPropertyAccessExpression(ts.factory.createThis(), "pointer"),
        ...func.args.map(a => types.createJSValueToInteropNode(a.type, ts.factory.createIdentifier(processName(a.name))))
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
      types.getTypeNodeForType(namespace, arg.type),
    )),
    types.getTypeNodeForType(namespace, func.returnType),
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
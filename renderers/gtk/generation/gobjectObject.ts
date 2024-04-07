import ts from "typescript";
import { FunctionInfo, StructInfo } from "../write";
import { TypeProvider } from "../infos/namespace";
import { ObjectInfo } from "../infos/object";

export const createGObjectNode = (namespace: string, object: ObjectInfo, types: TypeProvider) => {
  const { parent, abstract } = object;

  const staticMethods = [
    object.methods.filter(m => !m.flagNames.some(f => new Set([
      'GI_FUNCTION_IS_METHOD',
      'GI_FUNCTION_IS_GETTER',
      'GI_FUNCTION_IS_SETTER',
      'GI_FUNCTION_WRAPS_VFUNC',
    ]).has(f)))
  ].flat(1);

  const instanceFunctions = [
    object.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_METHOD"))
  ].flat(1).map(func => createGStructMethod(namespace, object, func, types));

  const modifiers = [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ...(abstract ? [ts.factory.createModifier(ts.SyntaxKind.AbstractKeyword)] : []),
  ]
  const name = object.name;

  const createStaticMethod = (func: FunctionInfo) => {
    const returnType = func.flagNames.includes("GI_FUNCTION_IS_CONSTRUCTOR")
      ? ts.factory.createTypeReferenceNode(object.name)
      : types.getTypeNodeForType(namespace, func.returnType);
    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.StaticKeyword)],
      undefined,
      func.name,
      undefined,
      [],
      func.args.map(arg => ts.factory.createParameterDeclaration(
        [],
        undefined,
        arg.name,
        undefined,
        types.getTypeNodeForType(namespace, arg.type),
      )),
      returnType,
      createGStructConstructorBody(namespace, object, func, types),
    )
  }

  const staticMembers = staticMethods.map(method => createStaticMethod(method))

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


  const parentNode = parent && (parent.namespace === namespace
    ? ts.factory.createIdentifier(parent.name)
    : ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(parent.namespace), parent.name));

  const fields = [
    ...(parentNode ? [] : [ts.factory.createPropertyDeclaration(
      [],
      'pointer', undefined, unknownPointerType,
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('ref'), 'NULL')
    )]),
  ];
  const members = [
    fields,
    ...(parentNode ? [] : [privateConstructor]),

    staticMembers,
    instanceFunctions,
  ].flat(1)

  return ts.factory.createClassDeclaration(modifiers, name, [], !parentNode ? [] : [ 
    ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.factory.createExpressionWithTypeArguments(
      parentNode,
      []
    )])
  ], members);
};

export const createGStructConstructorBody = (namespace: string, object: ObjectInfo, func: FunctionInfo, types: TypeProvider) => {
  if (!func.symbol) {
    return ts.factory.createBlock([
      ts.factory.createThrowStatement(
        ts.factory.createNewExpression(
          ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('global'), 'Error'),
          [],
          [ts.factory.createStringLiteral(`Can't find symbol for ${object.name}.${func.name}`)]
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
    ts.factory.createIdentifier(object.name),
    [],
    [callLibFunctionNode]
  );
  
  return ts.factory.createBlock([
    ts.factory.createReturnStatement(createInstanceNode),
  ], true)
}

export const createGStructMethod = (namespace: string, object: ObjectInfo, func: FunctionInfo, types: TypeProvider) => {
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
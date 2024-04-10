import ts from "typescript";
import { FunctionInfo, StructInfo } from "../write";
import { TypeProvider } from "../infos/namespace";
import { ObjectInfo } from "../infos/object";
import { createSignalGenerator } from "./gSignal";

const calcIsGoObject = (object: ObjectInfo, types: TypeProvider): boolean => {
  if (object.name === "Object")
    return true;
  if (!object.parent)
    return false;
  const parent = types.findTypeByName(object.parent.namespace, object.parent.name);
  if (!parent || parent.type !== "GI_INFO_TYPE_OBJECT")
    return false;

  return calcIsGoObject(parent.object, types);
}

export const createGObjectStatements = (
  namespace: string, object: ObjectInfo, types: TypeProvider
) => {
  const signalGen = createSignalGenerator(namespace, types);
  const isGObject = calcIsGoObject(object, types);
  
  return [
    isGObject ? [signalGen.createSignalTypeMap(object)] : [],
    createGObjectNode(namespace, object, isGObject, types),
  ].flat(1);
}

export const createGObjectNode = (namespace: string, object: ObjectInfo, isGObject: boolean, types: TypeProvider) => {
  const { parent, abstract } = object;

  const signalGen = createSignalGenerator(namespace, types);

  const instanceFlags = new Set([
    'GI_FUNCTION_IS_METHOD',
    'GI_FUNCTION_IS_GETTER',
    'GI_FUNCTION_IS_SETTER',
    'GI_FUNCTION_WRAPS_VFUNC',
  ]);

  const staticMethods = [
    object.methods.filter(m => !m.flagNames.some(f => instanceFlags.has(f)))
  ].flat(1);

  const instanceFunctions = [
    object.methods.filter(m => m.flagNames.includes("GI_FUNCTION_IS_METHOD"))
      .map(func => createGStructMethod(namespace, object, func, types)),
    ...(isGObject ? signalGen.createSignalMethods(object) : []),
  ].flat(1);

  const modifiers = [
    ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
    //...(abstract ? [ts.factory.createModifier(ts.SyntaxKind.AbstractKeyword)] : []),
  ]
  const name = object.name;

  const createStaticMethod = (func: FunctionInfo) => {
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
        types.getTypeNodeForType(arg.type),
      )),
      types.getTypeNodeForType(func.returnType),
      createMethodBody(namespace, object, func, types),
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
    (parentNode ? [] : [
      ts.factory.createPropertyDeclaration(
        [],
        'pointer', undefined, unknownPointerType,
        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('ref'), 'NULL')
      ),
      isGObject ? signalGen.createSignalProperties() : [],
    ].flat(1)),
    signalGen.createStaticSignalProperties(object.signals, parent),
  ].flat(1);
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

export const createMethodBody = (namespace: string, object: ObjectInfo, func: FunctionInfo, types: TypeProvider) => {
  return ts.factory.createBlock([
    ts.factory.createReturnStatement(types.createInteropToJSValueNode(func.returnType, ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(namespace), func.symbol || ''),
      [],
      [
        ...(func.isMethod ? [ts.factory.createPropertyAccessExpression(ts.factory.createThis(), "pointer")] : []),
        ...func.args.map(a => types.createJSValueToInteropNode(a.type, ts.factory.createIdentifier(processName(a.name))))
      ],
    ))),
  ], true);
}

export const createGStructMethod = (namespace: string, object: ObjectInfo, func: FunctionInfo, types: TypeProvider) => {

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
      types.getTypeNodeForType(arg.type),
    )),
    types.getTypeNodeForType(func.returnType),
    createMethodBody(namespace, object, func, types),
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
import ref from "ref-napi";
import ts from "typescript";
import { ObjectInfo, SignalInfo } from "../infos/object";
import { TypeProvider } from "../infos/namespace";
const { factory } = ts;

const { createPropertyDeclaration, createMethodDeclaration } = factory;

export type SignalGenerator = ReturnType<typeof createSignalGenerator>;

export const createSignalGenerator = (namespace: string, types: TypeProvider) => {

  const createStaticSignalProperties = (signals: SignalInfo[], parent: null | { name: string, namespace: string }) => {
    return [
      factory.createPropertyDeclaration(
        [factory.createModifier(ts.SyntaxKind.StaticKeyword)],
        'callbacks',
        undefined,
        undefined,
        factory.createObjectLiteralExpression([
          signals.map(createSignalCallbackNode),
          parent ? factory.createSpreadAssignment(
            factory.createPropertyAccessExpression(
              types.createIdentifierNode(parent.name, parent.namespace),
              'callbacks',
            )
          ) : []
        ].flat(1), true)
      ),
    ].flat(1);
  }

  const createSignalProperties = () => {
    return [
      
    ]
  };
  
  const createSignalMethods = (object: ObjectInfo) => {
    const typeMapName = object.name + "SignalMap";
    const genericNode = factory.createTypeParameterDeclaration(
      [], 'SignalName',
      factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        factory.createTypeReferenceNode(typeMapName)
      )
    )
    const paramNodes = [
      factory.createParameterDeclaration(
        [],undefined, 'type', undefined,
        factory.createTypeReferenceNode('SignalName')
      ),
      factory.createParameterDeclaration(
        [],undefined, 'callback', undefined,
        factory.createIndexedAccessTypeNode(
          factory.createTypeReferenceNode(typeMapName),
          factory.createTypeReferenceNode('SignalName')
        )
      ),
    ]
  
    const onMethodNode = createMethodDeclaration(
      [],
      undefined,
      'addEventListener',
      undefined,
      [genericNode],
      paramNodes,
      undefined,
      factory.createBlock([]),
    )
    const offMethodNode = createMethodDeclaration(
      [],
      undefined,
      'removeEventListener',
      undefined,
      [genericNode],
      paramNodes,
      undefined,
      factory.createBlock([]),
    )

    return [
      onMethodNode,
      offMethodNode,
    ];
  };

  /**
   * Create a "Type Map" for signals:
   * 
   * e.g:
   * ```
   * export type ApplicationSignalMap = {
   *   "activate": () => void,
   *   "click": (position: Vector2) => void,
   * }
   * ```
   */
  const createSignalTypeMap = (object: ObjectInfo) => {
    const { name, signals, parent } = object;
    const extensionNode = parent && types.createTypeReferenceNode(parent.name + "SignalMap", parent.namespace);

    const modifiers = [
      factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ];
    const type = factory.createTypeLiteralNode(signals.map(signal => {
      const type = types.createFunctionTypeNodeForCallable(signal);
      return factory.createPropertySignature([], factory.createStringLiteral(signal.name), undefined, type)
    }))
    const intersection = extensionNode && factory.createIntersectionTypeNode([type, extensionNode]);

    return factory.createTypeAliasDeclaration(modifiers, name + "SignalMap", [], intersection || type)

  };


  const createSignalCallbackNode = (signal: SignalInfo) => {

    const jsFunctionArgs = [
      factory.createParameterDeclaration([], undefined, 'user_data'),
      signal.args.map(a => factory.createParameterDeclaration([], undefined, a.name)),
    ].flat(1);

    const callbackNode = factory.createNewExpression(
      factory.createPropertyAccessExpression(
        factory.createIdentifier('ffi'),
        'Callback',
      ),
      [],
      [
        types.createFFITypeNode(signal.returnType),
        factory.createAsExpression(
          factory.createArrayLiteralExpression([
            factory.createStringLiteral('pointer'),
            signal.args.map(a => types.createFFITypeNode(a.type)),
          ].flat(1)),
          factory.createTypeReferenceNode('const'),
        ),
        factory.createArrowFunction([], [], jsFunctionArgs, undefined, undefined, factory.createBlock([

        ]))
      ]
    );

    return factory.createPropertyAssignment(
      factory.createStringLiteral(signal.name),
      callbackNode,
    )
  }

  return {
    createSignalProperties,
    createSignalMethods,
    createSignalTypeMap,
    createSignalCallbackNode,
    createStaticSignalProperties,
  }
}


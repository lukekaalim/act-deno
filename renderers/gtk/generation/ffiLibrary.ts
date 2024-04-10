import ts from "typescript";
import { NamespaceInfo, StructInfo } from "../write";
import { createFFIFunctionSignatureNode } from "./ffiSignature";
import { NamespaceLookup, NamespaceMap, TypeProvider } from "../infos/namespace";
import { ObjectInfo } from "../infos/object";

const { factory, SyntaxKind, NodeFlags } = ts;

const skipSymbols = new Set(["g_io_module_query"]);

const {
  createVariableDeclaration: vars,
  createVariableDeclarationList: varLst,
  createVariableStatement: varStmt,
  createReturnStatement: ret,
  createIdentifier: id,
  createPropertyAccessExpression: prop,
  createPropertyAssignment: setProp,
  createStringLiteral: str,
  createNumericLiteral: num,
  createArrayLiteralExpression: arr,
  createParameterDeclaration: param,
  createFunctionDeclaration: func,
  createAssignment: assign,
  createNewExpression: nw,
  createExpressionStatement: expr,
  createCallExpression: call,
  createModifier: mod,
  createTypeReferenceNode: tRef,
  createQualifiedName: tName,
  createKeywordTypeNode: tKey,
} = factory;

const exportMod = mod(SyntaxKind.ExportKeyword);

export const createFFILibraryNode = (namespace: NamespaceLookup, types: TypeProvider) => {
  if (!namespace.info.lib)
    return null;

  const allFunctions = [
    namespace.objects.map(o => o.methods),
    namespace.structs.map(s => s.methods),
    namespace.functions,
  ].flat(2).filter(f => f.symbol && !skipSymbols.has(f.symbol));

  const sharedObjectName = namespace.info.lib.split(',')[0];

  const symbolMap = new Map(allFunctions.map(f => [f.symbol, f]));

  return ts.factory.createNewExpression(
    ts.factory.createIdentifier('Library'),
    [],
    [
      ts.factory.createStringLiteral('/opt/homebrew/lib/' + sharedObjectName),
      ts.factory.createObjectLiteralExpression(
        [...symbolMap.values()]
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

export const createGObjectExtensionLibrary = (gObjectNamespace: NamespaceLookup) => {

  const connectFFIArgsNode = [
    'pointer',  // instance
    'CString',  // detailed_signal
    'pointer',  // c_handler
    'pointer',  // data
    'pointer',  // GClosureNotify
    'uint32',   // connect_flags
  ].map(s => factory.createStringLiteral(s))

  const libraryNode = ts.factory.createNewExpression(
    factory.createPropertyAccessExpression(
      factory.createIdentifier('ffi'),
      factory.createIdentifier('Library')
    ),
    [],
    [
      ts.factory.createStringLiteral('/opt/homebrew/lib/' + (gObjectNamespace.info.lib || '').split(',')[0]),
      ts.factory.createObjectLiteralExpression(
        [
          ts.factory.createPropertyAssignment(
            'g_signal_connect_data',
            factory.createArrayLiteralExpression([
              factory.createStringLiteral('ulong'),
              factory.createArrayLiteralExpression(connectFFIArgsNode),
            ], true),
          )
        ],
        true
      )
    ]
  )
  const signalMapNode = factory.createNewExpression(
    factory.createIdentifier('Map'),
    [
      factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword),
      factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
    ],
    [],
  );

  const let_vars = varStmt([], varLst([
    vars('signal_id_counter', undefined, undefined, num(0))
  ], NodeFlags.Let));
  const const_vars = varStmt([exportMod], varLst([
    vars('signal_map', undefined, undefined, nw(id('Map'), [], []))
  ], NodeFlags.Const))

  const connectFunc = func(
    [exportMod],
    undefined,
    'connect',
    [],
    [
      param([], undefined, 'object', undefined, tRef('Object')),
      param([], undefined, 'callback', undefined, tRef(tName(id('ffi'), 'Callback'), [tKey(SyntaxKind.UnknownKeyword)])),
      param([], undefined, 'func', undefined, tKey(SyntaxKind.UnknownKeyword)),
    ],
    undefined,
    factory.createBlock([
      varStmt([], varLst([
        vars('signal_id', undefined, undefined, factory.createPostfixIncrement(id('signal_id_counter')))
      ], NodeFlags.Const)),
      expr(
        call(prop(id('signal_map'), 'set'), [], [id('signal_id'), id('func')])
      ),
    ], true),
  )

  return [
    let_vars,
    const_vars,
    
    ts.factory.createVariableStatement(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList([
        factory.createVariableDeclaration(
          'global_signal_map',
          undefined,
          undefined,
          signalMapNode
        )
      ], ts.NodeFlags.Const)
    ),
    ts.factory.createVariableStatement(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList([
        factory.createVariableDeclaration(
          'gobject_signals',
          undefined,
          undefined,
          libraryNode
        )
      ], ts.NodeFlags.Const)
    ),
    connectFunc,
  ];
};

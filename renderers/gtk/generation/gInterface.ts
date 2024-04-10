import ts from 'typescript';
import { TypeProvider } from "../infos/namespace";
import { InterfaceInfo } from "../infos/object";

const { factory, SyntaxKind } = ts;

export const createInterfaceGenerator = (namespace: string, types: TypeProvider) => {

  const unknownPointerType = ts.factory.createTypeReferenceNode(
    ts.factory.createQualifiedName(ts.factory.createIdentifier('ref'), "Pointer"),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)]
  );

  const createInterfaceDeclarationNode = (interfaceInfo: InterfaceInfo) => {
    const pointerField = ts.factory.createPropertySignature(
      [],
      'pointer', undefined, unknownPointerType,
    );
    return factory.createInterfaceDeclaration(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      interfaceInfo.name,
      [],
      [],
      [pointerField],
    );
  };
  const createInterfaceStubClassDeclarationNode = (interfaceInfo: InterfaceInfo) => {
    const constructor = ts.factory.createConstructorDeclaration(
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
    const pointerField = ts.factory.createPropertyDeclaration(
      [],
      'pointer', undefined, unknownPointerType,
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('ref'), 'NULL')
    );

    return factory.createClassDeclaration(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      interfaceInfo.name + "Stub",
      [],
      [factory.createHeritageClause(SyntaxKind.ImplementsKeyword, [
        factory.createExpressionWithTypeArguments(factory.createIdentifier(interfaceInfo.name), []),
      ])],
      [constructor, pointerField],
    );
  };

  return { createInterfaceDeclarationNode, createInterfaceStubClassDeclarationNode }
}
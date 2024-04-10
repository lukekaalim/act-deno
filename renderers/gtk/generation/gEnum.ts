import ts from "typescript";
import { TypeProvider } from "../infos/namespace";
import { EnumInfo } from "../write";

const { factory, SyntaxKind } = ts;

export const createEnumGenerator = (types: TypeProvider) => {
  const createEnumNode = (enumInfo: EnumInfo) => {
    return factory.createEnumDeclaration(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      enumInfo.name,
      []
    );
  };
  const createFlagNode = (flagInfo: EnumInfo) => {
    return factory.createEnumDeclaration(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      flagInfo.name,
      []
    );
  }

  return {
    createEnumNode,
    createFlagNode,
  }
}
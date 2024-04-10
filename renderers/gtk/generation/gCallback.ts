import ts from "typescript";
import { TypeProvider } from "../infos/namespace";
import { CallbackInfo } from "../infos/callback";
import { SignalInfo } from "../infos/object";

const { factory, SyntaxKind } = ts;

export type CallbackGenerator = ReturnType<typeof createCallbackGenerator>;

export const createCallbackGenerator = (types: TypeProvider) => {
  const createCallbackTypeSignature = (callback: CallbackInfo) => {
    return factory.createTypeAliasDeclaration(
      [factory.createModifier(SyntaxKind.ExportKeyword)],
      callback.name,
      [],
      types.createFunctionTypeNodeForCallable(callback),
    )
  };

  return {
    createCallbackTypeSignature,
  }
};

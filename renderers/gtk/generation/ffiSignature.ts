import { TypeProvider } from '../infos/namespace';
import { FunctionInfo, TypeInfo } from '../write'
import ts from 'typescript';

export const createFFIFunctionSignatureNode = (info: FunctionInfo, types: TypeProvider) => {

  const providedArgs = info.args.map(arg =>
    types.createFFITypeNode(arg.type));

  if (info.flagNames.includes('GI_FUNCTION_IS_METHOD')) {
    return ts.factory.createArrayLiteralExpression([
      types.createFFITypeNode(info.returnType),
      ts.factory.createArrayLiteralExpression([ts.factory.createStringLiteral('pointer'), ...providedArgs]),
    ]);
  }

  return ts.factory.createArrayLiteralExpression([
    types.createFFITypeNode(info.returnType),
    ts.factory.createArrayLiteralExpression(providedArgs),
  ]);
}



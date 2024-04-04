import { FunctionInfo, TypeInfo } from '../write'
import ts from 'typescript';

export const createFFIFunctionSignatureNode = (info: FunctionInfo) => {

  const providedArgs = info.args.map(arg =>
    createFFITypeNode(arg.type));

  if (info.flagNames.includes('GI_FUNCTION_IS_METHOD')) {
    return ts.factory.createArrayLiteralExpression([
      createFFITypeNode(info.returnType),
      ts.factory.createArrayLiteralExpression([ts.factory.createStringLiteral('pointer'), ...providedArgs]),
    ]);
  }

  return ts.factory.createArrayLiteralExpression([
    createFFITypeNode(info.returnType),
    ts.factory.createArrayLiteralExpression(providedArgs),
  ]);
}

export const createFFITypeNode = (info: TypeInfo) => {
  switch (info.tagName) {
    default:
    case 'GI_TYPE_TAG_VOID':
      return ts.factory.createStringLiteral('void');
    case 'GI_TYPE_TAG_UINT8':
      return ts.factory.createStringLiteral('uint8');
    case 'GI_TYPE_TAG_UINT16':
      return ts.factory.createStringLiteral('uint16');
    case 'GI_TYPE_TAG_UINT32':
      return ts.factory.createStringLiteral('uint32');
    case 'GI_TYPE_TAG_INTERFACE':
      return ts.factory.createStringLiteral('pointer');
    case 'GI_TYPE_TAG_BOOLEAN':
      return ts.factory.createStringLiteral('bool');
  }
}


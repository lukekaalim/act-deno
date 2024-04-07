import ts from "typescript";
import { BaseInfo, EnumInfo, FunctionInfo, NamespaceInfo, StructInfo, TypeInfo } from "../write.ts";
import { InterfaceInfo } from "./inter.ts";
import { CallbackInfo } from "./callback.ts";
import { ObjectInfo } from "./object.ts";

export type NamespaceMap = Map<string, NamespaceLookup>;

export type NamespaceLookup = {
  objects: ObjectInfo[],
  structs: StructInfo[],
  functions: FunctionInfo[],
  callbacks: CallbackInfo[],
  enums: EnumInfo[],
  flags: EnumInfo[],
  interfaces: InterfaceInfo[]

  byName: Map<string, BaseInfo>,

  info: NamespaceInfo,
  name: string,
}

export const createNamespaceLookups = (ns: Map<string, NamespaceInfo>) => {
  return new Map([...ns.entries()]
    .map(([name, info]) => {
      const lookup: NamespaceLookup = {
        objects: [],
        structs: [],
        functions: [],
        callbacks: [],
        enums: [],
        flags: [],
        interfaces: [],

        byName: new Map(),
        info,
        name,
      }
      for (const baseInfo of info.infos) {
        if (baseInfo.type === "GI_INFO_TYPE_OBJECT") {
          lookup.objects.push(baseInfo.object);
          lookup.byName.set(baseInfo.object.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_STRUCT") {
          lookup.structs.push(baseInfo.struct);
          lookup.byName.set(baseInfo.struct.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_ENUM") {
          lookup.enums.push(baseInfo.enum);
          lookup.byName.set(baseInfo.enum.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_FLAGS") {
          lookup.flags.push(baseInfo.flags);
          lookup.byName.set(baseInfo.flags.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_FUNCTION") {
          lookup.functions.push(baseInfo.func);
          lookup.byName.set(baseInfo.func.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_CALLBACK") {
          lookup.callbacks.push(baseInfo.callback);
          lookup.byName.set(baseInfo.callback.name, baseInfo);
        }
        if (baseInfo.type === "GI_INFO_TYPE_INTERFACE") {
          lookup.interfaces.push({ name: baseInfo.interface.name });
          lookup.byName.set(baseInfo.interface.name, baseInfo);
        }
        if (baseInfo.type === "unknown") {
          lookup.byName.set(baseInfo.value.name, baseInfo);
        }
      }
      return [name, lookup];
    })
  );
}

export type TypeProvider = ReturnType<typeof createNamespaceTypeProvider>;

export const createNamespaceTypeProvider = (nss: NamespaceMap) => {

  const createFFITypeNode = (info: TypeInfo) => {
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
      case 'GI_TYPE_TAG_UINT64':
        return ts.factory.createStringLiteral('uint64');
      case 'GI_TYPE_TAG_INT8':
        return ts.factory.createStringLiteral('int8');
      case 'GI_TYPE_TAG_INT16':
        return ts.factory.createStringLiteral('int16');
      case 'GI_TYPE_TAG_INT32':
        return ts.factory.createStringLiteral('int32');
      case 'GI_TYPE_TAG_INT64':
      case 'GI_TYPE_TAG_GTYPE':
        return ts.factory.createStringLiteral('int64');
      case 'GI_TYPE_TAG_UTF8':
        return ts.factory.createStringLiteral('CString');
      case 'GI_TYPE_TAG_ARRAY':
        return ts.factory.createStringLiteral('pointer');
      case 'GI_TYPE_TAG_INTERFACE':
        if (!info.interfaceName || !info.namespace)
          throw new Error();
        const ns = nss.get(info.namespace) as NamespaceLookup;
        const interfaceInfo = ns.byName.get(info.interfaceName);
        if (!interfaceInfo) {
          console.warn(
            new Error(`Failed to find ${info.interfaceName} in namespace ${info.namespace}`)
          )
          return ts.factory.createStringLiteral('pointer');
        }
        switch (interfaceInfo.type) {
          case 'GI_INFO_TYPE_OBJECT':
          case 'GI_INFO_TYPE_STRUCT':
            return ts.factory.createStringLiteral('pointer');
          case 'unknown':
            return ts.factory.createStringLiteral('pointer');
          case 'GI_INFO_TYPE_ENUM':
          case 'GI_INFO_TYPE_FLAGS':
            return ts.factory.createStringLiteral('uint64');
          default:
            return ts.factory.createStringLiteral('void');
        }
      case 'GI_TYPE_TAG_ERROR':
        return ts.factory.createStringLiteral('pointer');
      case 'GI_TYPE_TAG_BOOLEAN':
        return ts.factory.createStringLiteral('bool');
    }
  }

  const createInteropToJSValueNode = (typeInfo: TypeInfo, interopValue: ts.Expression) => {
    switch (typeInfo.tagName) {
      default:
        return interopValue;
      case 'GI_TYPE_TAG_ERROR':
        return ts.factory.createNewExpression(
          ts.factory.createIdentifier('Error'),
          [],
          [interopValue]
        );
      case 'GI_TYPE_TAG_INTERFACE':
        if (!typeInfo.interfaceName)
          throw new Error();
        return ts.factory.createNewExpression(
          ts.factory.createIdentifier(typeInfo.interfaceName),
          [],
          [interopValue]
        );
    }
  }

  const createJSValueToInteropNode = (typeInfo: TypeInfo, jsValue: ts.Expression) => {
    switch (typeInfo.tagName) {
      default:
        return jsValue;
      case 'GI_TYPE_TAG_INTERFACE':
        if (!typeInfo.interfaceName || !typeInfo.namespace)
          throw new Error();
        const ns = nss.get(typeInfo.namespace) as NamespaceLookup;
        const interfaceInfo = ns.byName.get(typeInfo.interfaceName);
        if (!interfaceInfo) {
          //throw new Error(`Could not find interface ${typeInfo.interfaceName} in namespace ${typeInfo.namespace}`);
          return ts.factory.createPropertyAccessExpression(jsValue, "pointer")
        }
        switch (interfaceInfo.type) {
          case 'GI_INFO_TYPE_OBJECT':
          case 'GI_INFO_TYPE_STRUCT':
            return ts.factory.createPropertyAccessExpression(jsValue, "pointer")
          case 'GI_INFO_TYPE_ENUM':
          case 'GI_INFO_TYPE_FLAGS':
          default:
            return jsValue;
        }
    }
  };  

  return {
    createFFITypeNode,
    createJSValueToInteropNode,
    createInteropToJSValueNode,
    getTypeNodeForType(currentNamespace: string, type: TypeInfo) {
      switch (type.tagName) {
        case 'GI_TYPE_TAG_INTERFACE': {
          if (!type.interfaceName || !type.namespace)
            throw new Error();
          const ns = nss.get(type.namespace) as NamespaceLookup;
          if (currentNamespace !== ns.name) {
            return ts.factory.createTypeReferenceNode(ts.factory.createQualifiedName(
              ts.factory.createIdentifier(ns.name),
              type.interfaceName
            ));
          }
          // Assume the relevant interface is just handing around in here somewhere
          return ts.factory.createTypeReferenceNode(type.interfaceName);
        }
        case 'GI_TYPE_TAG_ERROR':
          return ts.factory.createTypeReferenceNode('Error');
        case 'GI_TYPE_TAG_UINT8':
        case 'GI_TYPE_TAG_UINT16':
        case 'GI_TYPE_TAG_UINT32':
        case 'GI_TYPE_TAG_INT8':
        case 'GI_TYPE_TAG_INT16':
        case 'GI_TYPE_TAG_INT32':
          return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'GI_TYPE_TAG_BOOLEAN':
          return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
        case 'GI_TYPE_TAG_INT64':
        case 'GI_TYPE_TAG_UINT64':
          return ts.factory.createUnionTypeNode([
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          ])
        case 'GI_TYPE_TAG_UTF8':
          return ts.factory.createUnionTypeNode([
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.factory.createLiteralTypeNode(ts.factory.createNull()),
          ])
        default:
          return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
        case 'GI_TYPE_TAG_VOID':
          return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
      }
    }
  }
}

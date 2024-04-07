import ref, { NULL, NULL_POINTER } from "ref-napi";
import {
  GiFunctionInfoFlag,
  InfoRef, baseInfoType, baseInfoTypes, callableInfo, g_error,
  g_error_pointer2, g_repo_struct, gi, gi_function_info_flag_masks,
  
  gi_function_info_flags, gi_type_tag, gi_type_tags, libgi, objectInfo, repo
 } from "./lib";

import { writeFile, readFile } from 'node:fs/promises';
import { CallbackInfo, getCallbackInfo } from "./infos/callback";
import { InterfaceInfo, ObjectInfo, getInterfaceInfo, getObjectInfo } from "./infos/object";

type OutputInfo =
  | { name: string | null, type: Exclude<keyof typeof baseInfoType, "GI_INFO_TYPE_OBJECT"> }
  | ReturnType<typeof getObjectInfo>

export type NamespaceInfo = {
  infos: BaseInfo[],
  version: string,

  lib: string | null,
}

export type BaseInfo =
  | { type: 'GI_INFO_TYPE_OBJECT', object: ObjectInfo }
  | { type: 'GI_INFO_TYPE_STRUCT', struct: StructInfo }
  | { type: 'GI_INFO_TYPE_ENUM', enum: EnumInfo }
  | { type: 'GI_INFO_TYPE_FLAGS', flags: EnumInfo }
  | { type: 'GI_INFO_TYPE_FUNCTION', func: FunctionInfo }
  | { type: 'GI_INFO_TYPE_CALLBACK', callback: CallbackInfo }
  | { type: 'GI_INFO_TYPE_CONSTANT', const: ConstantInfo }
  | { type: 'GI_INFO_TYPE_INTERFACE', interface: InterfaceInfo }
  | { type: 'unknown', value: { type: string, name: string } }

export const writeNamespace = async (namespace: string, filter?: (info: InfoRef) => boolean) => {
  const output = getNamespaceInfo(namespace, filter);

  await writeFile(`out/${namespace}.json`, JSON.stringify(output, null, 2));

  console.log(`Written to out/${namespace}.json`);

  return output;
}

export const readNamespace = async (namespace: string): Promise<NamespaceInfo> => {
  const file = await readFile(`out/${namespace}.json`, 'utf-8');
  return JSON.parse(file);
}

export const unrefPassthrough = <T>(map: (value: InfoRef) => T) => (info: InfoRef): T => {
  const result = map(info);
  gi.baseInfo.g_base_info_unref(info);
  return result;
}

export const getNamespaceInfo = (namespace: string, filter?: (info: InfoRef) => boolean): NamespaceInfo => {
  console.log('namespace:', namespace);
  const infoCount = libgi.g_irepository_get_n_infos(repo, namespace);
  const infos = Array.from({ length: infoCount })
    .map((_, i) => (gi.lib.g_irepository_get_info(repo, namespace, i)))
    .filter(filter || (() => true))
    .map(unrefPassthrough(getBaseInfo));
  const version = gi.repo.g_irepository_get_version(repo, namespace) || 'UnknownVersion';

  return {
    version,
    lib: gi.lib.g_irepository_get_shared_library(repo, namespace),
    infos,
  }
}

export const getBaseInfo = (info: InfoRef): BaseInfo => {
  const type = libgi.g_base_info_get_type(info);
  switch (type) {
    case baseInfoType.GI_INFO_TYPE_OBJECT:
      return { type: 'GI_INFO_TYPE_OBJECT', object: getObjectInfo(info) };
    case baseInfoType.GI_INFO_TYPE_STRUCT:
      return { type: 'GI_INFO_TYPE_STRUCT', struct: getStructInfo(info) };
    case baseInfoType.GI_INFO_TYPE_ENUM:
      return { type: 'GI_INFO_TYPE_ENUM', enum: getEnumInfo(info) };
    case baseInfoType.GI_INFO_TYPE_FLAGS:
      return { type: 'GI_INFO_TYPE_FLAGS', flags: getEnumInfo(info) };
    case baseInfoType.GI_INFO_TYPE_FUNCTION:
      return { type: 'GI_INFO_TYPE_FUNCTION', func: getFunctionInfo(info) };
    case baseInfoType.GI_INFO_TYPE_CALLBACK:
      return { type: 'GI_INFO_TYPE_CALLBACK', callback: getCallbackInfo(info) }
    case baseInfoType.GI_INFO_TYPE_CONSTANT:
      return { type: 'GI_INFO_TYPE_CONSTANT', const: getConstantInfo(info) }
    case baseInfoType.GI_INFO_TYPE_INTERFACE:
      return { type: 'GI_INFO_TYPE_INTERFACE', interface: getInterfaceInfo(info) }
    default:
      const name = libgi.g_base_info_get_name(info) || 'UnknownInfo';
      console.log(`  ${baseInfoTypes[type]}(unknown):`, name);
      return { type: 'unknown', value: { type: baseInfoTypes[type], name } };
  }
}

export type StructInfo = {
  name: string,
  fields: FieldInfo[],
  methods: FunctionInfo[],
}

export const getStructInfo = (info: InfoRef): StructInfo => {
  const name = libgi.g_base_info_get_name(info) || 'UnknownStruct';
  console.log('  struct:', name);
  const fieldCount = gi.structInfo.g_struct_info_get_n_fields(info);
  const methodCount = gi.structInfo.g_struct_info_get_n_methods(info);
  const fields = Array.from({ length: fieldCount })
    .map((_, i) =>  gi.structInfo.g_struct_info_get_field(info, i))
    .map(unrefPassthrough(getFieldInfo));
  const methods = Array.from({ length: methodCount })
    .map((_, i) =>  gi.structInfo.g_struct_info_get_method(info, i))
    .map(unrefPassthrough(getFunctionInfo))

  return {
    name,
    fields,
    methods,
  }
}

export type CallableInfo = {
  args: ArgInfo[],
  returnType: TypeInfo,

  isMethod: boolean,
  isReturnTypeNullable: boolean,
}
export const getCallableInfo = (method: InfoRef): CallableInfo => {
  const argCount = gi.callableInfo.g_callable_info_get_n_args(method);
  const args = Array.from({ length: argCount })
    .map((_, i) => callableInfo.g_callable_info_get_arg(method, i))
    .map(unrefPassthrough(getArgInfo));
  const returnType = getTypeInfo(
    gi.callableInfo.g_callable_info_get_return_type(method)
  );
  const isMethod = gi.callableInfo.g_callable_info_is_method(method);
  const isReturnTypeNullable = gi.callableInfo.g_callable_info_may_return_null(method);

  return {
    args,
    returnType,
    isReturnTypeNullable,
    isMethod,
  }
}

export type FunctionInfo = CallableInfo & {
  name: string,
  flags: number,
  flagNames: GiFunctionInfoFlag[],
  symbol: null | string,
  args: ArgInfo[],
  returnType: TypeInfo,
};

export const getFunctionInfo = (method: InfoRef): FunctionInfo => {
  const name = gi.lib.g_base_info_get_name(method) || 'UnknownMethod';

  const symbol = gi.functionInfo.g_function_info_get_symbol(method);
  
  const flags = gi.functionInfo.g_function_info_get_flags(method);
  const flagNames = gi_function_info_flags.filter(flag => {
    const mask = gi_function_info_flag_masks[flag];
    return ((mask & flags) !== 0)
  })

  console.log('    function:', name);
  
  return {
    name,
    flags,
    flagNames,
    symbol,
    ...getCallableInfo(method),
  } as const;
}

export type FieldInfo = {
  name: string,
  offset: number,
  size: number,
  type: TypeInfo,
}

export const getFieldInfo = (field: InfoRef): FieldInfo => {
  const name = gi.lib.g_base_info_get_name(field) || 'UnknownField';
  console.log('    field:', name);

  return {
    name,
    offset: gi.fieldInfo.g_field_info_get_offset(field),
    size: gi.fieldInfo.g_field_info_get_size(field),
    type: getTypeInfo(gi.fieldInfo.g_field_info_get_type(field)),
  } as const;
}

export type ArgInfo = {
  name: string,
  type: TypeInfo,
}

export const getArgInfo = (arg: InfoRef): ArgInfo => {
  return {
    name: gi.lib.g_base_info_get_name(arg) || 'UnknownArg',
    type: getTypeInfo(gi.argInfo.g_arg_info_get_type(arg)),
  } as const;
}

export type TypeInfo = {
  tag: number,
  tagName: typeof gi_type_tags[number],
  interfaceName: string | null,
  namespace: string | null,
}

export const getTypeInfo = (type: InfoRef): TypeInfo => {
  const tag = gi.typeInfo.g_type_info_get_tag(type);
  const tagName = gi_type_tag[gi.typeInfo.g_type_info_get_tag(type)];

  if (tagName === 'GI_TYPE_TAG_INTERFACE') {
    const interfaceType = gi.typeInfo.g_type_info_get_interface(type);
    return {
      interfaceName: gi.baseInfo.g_base_info_get_name(interfaceType) || 'UnknownInterface',
      tag,
      tagName,
      namespace: gi.baseInfo.g_base_info_get_namespace(interfaceType),
    }
  }

  return {
    interfaceName: null,
    tag,
    tagName,
    namespace: null,
  } as const;
}

export type EnumInfo = {
  name: string,
  values: ValueInfo[],
  methods: FunctionInfo[],
}

export const getEnumInfo = (enumRef: InfoRef): EnumInfo => {
  const name = gi.baseInfo.g_base_info_get_name(enumRef) || 'UnknownEnum';
  const methodCount = gi.enum.g_enum_info_get_n_methods(enumRef);
  const valueCount = gi.enum.g_enum_info_get_n_values(enumRef);
  const methods = Array.from({ length: methodCount })
    .map((_, i) => gi.enum.g_enum_info_get_method(enumRef, i))
    .map(unrefPassthrough(getFunctionInfo));
  const values = Array.from({ length: valueCount })
    .map((_, i) => gi.enum.g_enum_info_get_value(enumRef, i))
    .map(unrefPassthrough((value) => ({
      name: gi.baseInfo.g_base_info_get_name(value) || 'UnknownValue',
      value: gi.enum.g_value_info_get_value(value),
    })));

  console.log('  enum:', name);

  return {
    name,
    values,
    methods,
  }
}

export type ValueInfo = {
  name: string,
  value: number | string,
}

export type ConstantInfo = {
  name: string,
  type: TypeInfo,
}

export const getConstantInfo = (constRef: InfoRef): ConstantInfo => {
  const name = gi.baseInfo.g_base_info_get_name(constRef) || 'UnknownConstant';
  const type = getTypeInfo(gi.const.g_constant_info_get_type(constRef));
  console.log('  const:', name);

  return {
    name,
    type,
  }
}
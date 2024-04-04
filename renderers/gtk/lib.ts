import { Callback, Library } from 'ffi-napi';
import ref, { get, readCString, sizeof } from 'ref-napi';
import { types, alloc, refType, hexAddress } from 'ref-napi'
import struct from 'ref-struct-di';
import array from 'ref-array-di';

import { readUntilNull } from './ffi';

export const createStructType = struct(ref);

export const g_repo_struct = refType(createStructType({}))

export const g_error = createStructType({
  domain: types.uint32,
  code: types.uint32,
  message: types.CString,
});

export const g_list_generic = <T extends ref.TypeLike>(type: T) => createStructType({
  data: 'pointer',
  next: 'pointer',
  prev: 'pointer',
})

export const g_infos_struct = createStructType({});
export const g_infos = refType(g_infos_struct);
export type InfoRef = ref.Pointer<ref.UnderlyingType<typeof g_infos_struct>>

export const g_error_pointer2 = refType(g_error)

const libPath = '/usr/lib/x86_64-linux-gnu/libgirepository-1.0.so.1';

//const g_error_pointer = refType(g_error);
export const libgi = Library(libPath, {
  'g_irepository_get_loaded_namespaces': [refType(types.CString), [g_repo_struct]],
  'g_irepository_get_shared_library': [types.CString, [g_repo_struct, types.CString]],

  'g_irepository_get_default': [g_repo_struct, []],
  'g_irepository_get_n_infos': [types.int32, [g_repo_struct, types.CString]],
  'g_irepository_get_info': [g_infos, [g_repo_struct, types.CString, types.int]],

  'g_irepository_require': [types.void, [g_repo_struct, types.CString, types.CString, types.int, g_error_pointer2]],
  "g_irepository_find_by_name": [g_infos, [g_repo_struct, types.CString, types.CString]],
  'g_irepository_prepend_search_path': [types.void, [types.CString]],
  'g_irepository_get_search_path': [g_list_generic(types.CString), []],

  'g_base_info_get_name': [types.CString, [g_infos]],
  'g_base_info_get_type': [types.int, [g_infos]],
});

export const gi_base_info = ref.refType(createStructType({}));
export const gi_struct_info = ref.refType(createStructType({}));
export const gi_field_info = ref.refType(createStructType({}));
export const gi_type_info = ref.refType(createStructType({}));
export const gi_function_info = ref.refType(createStructType({}));
export const gi_callable_info = ref.refType(createStructType({}));
export const gi_arg_info = ref.refType(createStructType({}));
export const gi_enum_info = ref.refType(createStructType({}));
export const gi_value_info = ref.refType(createStructType({}));
export const gi_constant_info = ref.refType(createStructType({}));

export const baseInfo = Library(libPath, {
  'g_base_info_unref': [types.void, [gi_base_info]],
  'g_base_info_get_name': [types.CString, [gi_base_info]],
  'g_base_info_get_type': [types.int, [gi_base_info]],
  'g_base_info_get_namespace': [types.CString, [gi_base_info]]
})

export const objectInfo = Library(libPath, {
  'g_object_info_get_n_fields': [types.int32, [g_infos]],
  'g_object_info_get_field': [gi_field_info, [g_infos, types.int32]],

  'g_object_info_get_n_methods': [types.int32, [g_infos]],
  'g_object_info_get_method': [gi_function_info, [g_infos, types.int32]],
});
export const structInfo = Library(libPath, {
  'g_struct_info_get_n_fields': [types.int32, [gi_struct_info]],
  'g_struct_info_get_field': [gi_field_info, [gi_struct_info, types.int32]],

  'g_struct_info_get_n_methods': [types.int32, [gi_struct_info]],
  'g_struct_info_get_method': [gi_function_info, [gi_struct_info, types.int32]],

  'g_struct_info_get_size': [types.size_t, [gi_struct_info]],
  'g_struct_info_is_gtype_struct': [types.bool, [gi_struct_info]],
  'g_struct_info_is_foreign': [types.bool, [gi_struct_info]],
});
export const fieldInfo = Library(libPath, {
  'g_field_info_get_offset': [types.int32, [gi_field_info]],
  'g_field_info_get_size': [types.int32, [gi_field_info]],
  'g_field_info_get_type': [gi_type_info, [gi_field_info]],
});

export const typeInfo = Library(libPath, {
  'g_type_info_get_tag': [types.int32, [gi_type_info]],
  'g_type_info_get_interface': [gi_base_info, [gi_type_info]]
});

export const functionInfo = Library(libPath, {
  'g_function_info_get_symbol': [types.CString, [gi_function_info]],
  'g_function_info_get_flags': [types.int32, [gi_function_info]],
});

export const callableInfo = Library(libPath, {
  'g_callable_info_get_n_args': [types.int32, [gi_callable_info]],
  'g_callable_info_get_arg': [gi_arg_info, [gi_callable_info, types.int32]],

  'g_callable_info_get_return_type': [gi_type_info, [gi_callable_info]],
  'g_callable_info_may_return_null': [types.bool, [gi_callable_info]],
  'g_callable_info_is_method': [types.bool, [gi_callable_info]],
});

export const argInfo = Library(libPath, {
  'g_arg_info_get_type': [gi_type_info, [gi_arg_info]],
});

export const enumLib = Library(libPath, {
  'g_enum_info_get_n_values': [types.int32, [gi_enum_info]],
  'g_enum_info_get_value': [gi_value_info, [gi_enum_info, types.int32]],
  'g_enum_info_get_n_methods': [types.int32, [gi_enum_info]],
  'g_enum_info_get_method': [gi_function_info, [gi_enum_info, types.int32]],
  'g_enum_info_get_storage_type': [types.uint64, [gi_enum_info]],
  'g_value_info_get_value': [types.uint64, [gi_value_info]]
});

export const constLib = Library(libPath, {
  'g_constant_info_get_type': [gi_type_info, [gi_constant_info]],
});

export const gi = {
  lib: libgi,
  objectInfo,
  typeInfo,
  fieldInfo,
  functionInfo,
  callableInfo,
  argInfo,
  structInfo,
  baseInfo,
  enum: enumLib,
  const: constLib,
}

export const baseInfoType = {
  GI_INFO_TYPE_INVALID:       0,
  GI_INFO_TYPE_FUNCTION:      1,
  GI_INFO_TYPE_CALLBACK:      2,
  GI_INFO_TYPE_STRUCT:        3,
  GI_INFO_TYPE_BOXED:         4,
  GI_INFO_TYPE_ENUM:          5,
  GI_INFO_TYPE_FLAGS:         6,
  GI_INFO_TYPE_OBJECT:        7,
  GI_INFO_TYPE_INTERFACE:     8,
  GI_INFO_TYPE_CONSTANT:      9,
  GI_INFO_TYPE_INVALID_0:     10,
  GI_INFO_TYPE_UNION:         11,
  GI_INFO_TYPE_VALUE:         12,
  GI_INFO_TYPE_SIGNAL:        13,
  GI_INFO_TYPE_VFUNC:         14,
  GI_INFO_TYPE_PROPERTY:      15,
  GI_INFO_TYPE_FIELD:         16,
  GI_INFO_TYPE_ARG:           17,
  GI_INFO_TYPE_TYPE:          18,
  GI_INFO_TYPE_UNRESOLVED:    19,
} as const;

export const gi_type_tags = [
  'GI_TYPE_TAG_VOID',
  'GI_TYPE_TAG_BOOLEAN',
  'GI_TYPE_TAG_INT8',
  'GI_TYPE_TAG_UINT8',
  'GI_TYPE_TAG_INT16',
  'GI_TYPE_TAG_UINT16',
  'GI_TYPE_TAG_INT32',
  'GI_TYPE_TAG_UINT32',
  'GI_TYPE_TAG_INT64',
  'GI_TYPE_TAG_UINT64',
  'GI_TYPE_TAG_FLOAT',
  'GI_TYPE_TAG_DOUBLE',
  'GI_TYPE_TAG_GTYPE',
  'GI_TYPE_TAG_UTF8',
  'GI_TYPE_TAG_FILENAME',
  'GI_TYPE_TAG_ARRAY',
  'GI_TYPE_TAG_INTERFACE',
  'GI_TYPE_TAG_GLIST',
  'GI_TYPE_TAG_GSLIST',
  'GI_TYPE_TAG_GHASH',
  'GI_TYPE_TAG_ERROR',
  'GI_TYPE_TAG_UNICHAR',
] as const;

export const gi_function_info_flags = [
  'GI_FUNCTION_IS_METHOD',
  'GI_FUNCTION_IS_CONSTRUCTOR',
  'GI_FUNCTION_IS_GETTER',
  'GI_FUNCTION_IS_SETTER',
  'GI_FUNCTION_WRAPS_VFUNC',
  'GI_FUNCTION_THROWS',
] as const;
export type GiFunctionInfoFlag = typeof gi_function_info_flags[number];

export const gi_function_info_flag_masks = Object.fromEntries(gi_function_info_flags.map((flag, index) => {
  return [flag, 1 << index];
})) as Record<(typeof gi_function_info_flags)[number], number>;

export const gi_type_tag: Record<number, typeof gi_type_tags[number]> = Object.fromEntries(gi_type_tags.map((key, index) => {
  return [index, key];
}))
export const gi_type_tag_name = Object.fromEntries(gi_type_tags.map((key, index) => {
  return [key, index];
})) as Record<typeof gi_type_tags[number], number>;

export const baseInfoTypes: Record<number, string> = Object.fromEntries(Object.keys(baseInfoType).map(key => {
  return [baseInfoType[key as keyof typeof baseInfoType], key];
}))

export const repo = libgi.g_irepository_get_default();

export const errorPointer = alloc(g_error_pointer2);
errorPointer.writePointer(ref.NULL, 0);

export const addNamespace = (namespace: string, version: string) => {
  libgi.g_irepository_require(repo, namespace, version, 0, errorPointer);
}
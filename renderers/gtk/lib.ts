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

export const g_infos_struct = createStructType({})
export const g_infos = refType(g_infos_struct);

export const g_error_pointer2 = refType(g_error)

export const libglib = Library('/opt/homebrew/Cellar/glib/2.80.0_2/lib/libglib-2.0.dylib', {
  'g_list_foreach': [types.void, [g_list_generic('pointer'), 'pointer', 'pointer']],
  'g_list_length': [types.uint32, [g_list_generic('pointer')]],
});

//const g_error_pointer = refType(g_error);
export const libgi = Library('/opt/homebrew/lib/libgirepository-1.0.1.dylib', {
  'g_irepository_get_loaded_namespaces': [refType(types.CString), [g_repo_struct]],

  'g_irepository_get_default': [g_repo_struct, []],
  'g_irepository_get_n_infos': [types.int32, [g_repo_struct, types.CString]],
  'g_irepository_get_info': [g_infos, [g_repo_struct, types.CString, types.int]],

  'g_irepository_require': [types.void, [g_repo_struct, types.CString, types.CString, types.int, g_error_pointer2]],
  "g_irepository_find_by_name": [g_infos, [g_repo_struct, types.CString, types.CString]],
  'g_irepository_prepend_search_path': [types.void, [types.CString]],
  'g_irepository_get_search_path': [g_list_generic(types.CString), []],

  'g_base_info_get_name': [types.CString, [g_infos]],
  //'g_info_type_to_string': [types.CString, [g_infos_struct]],
  'g_base_info_get_type': [types.int, [g_infos]],
  //'g_irepository_get_loaded_namespaces': []
});

export const baseInfoTypes: Record<number, string> = {
  0: 'GI_INFO_TYPE_INVALID',
  1: 'GI_INFO_TYPE_FUNCTION',
  2: 'GI_INFO_TYPE_CALLBACK',
  3: 'GI_INFO_TYPE_STRUCT',
  4: 'GI_INFO_TYPE_BOXED',
  5: 'GI_INFO_TYPE_ENUM',
  6: 'GI_INFO_TYPE_FLAGS',
  7: 'GI_INFO_TYPE_OBJECT',
  8: 'GI_INFO_TYPE_INTERFACE',
  9: 'GI_INFO_TYPE_CONSTANT',
  10: 'GI_INFO_TYPE_INVALID_0',
  11: 'GI_INFO_TYPE_UNION',
  12: 'GI_INFO_TYPE_VALUE',
  13: 'GI_INFO_TYPE_SIGNAL',
  14: 'GI_INFO_TYPE_VFUNC',
  15: 'GI_INFO_TYPE_PROPERTY',
  16: 'GI_INFO_TYPE_FIELD',
  17: 'GI_INFO_TYPE_ARG',
  18: 'GI_INFO_TYPE_TYPE',
  19: 'GI_INFO_TYPE_UNRESOLVED',
}

export const repo = libgi.g_irepository_get_default();

export const errorPointer = alloc(g_error_pointer2);
errorPointer.writePointer(ref.NULL, 0);

export const addNamespace = (namespace: string, version: string) => {
  libgi.g_irepository_require(repo, namespace, version, 0, errorPointer);
}
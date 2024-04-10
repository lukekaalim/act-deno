import { InfoRef, gi, objectInfo } from "../lib";
import { CallableInfo, FieldInfo, FunctionInfo, getCallableInfo, getFieldInfo, getFunctionInfo, unrefPassthrough } from "../write";

export type ObjectInfo = {
  parent: { name: string, namespace: string } | null,
  name: string,
  abstract: boolean,
  fields: FieldInfo[],
  methods: FunctionInfo[],

  properties: PropertyInfo[],
  vfuncs: VFuncInfo[],
  signals: SignalInfo[],
  interfaces: InterfaceInfo[],
}
export type PropertyInfo = {
  name: string,
}
export type VFuncInfo = {
  name: string,
}
export type SignalInfo = CallableInfo & {
  name: string,
}
export type InterfaceInfo = {
  name: string,
}

export const getObjectInfo = (info: InfoRef): ObjectInfo => {
  const name = gi.baseInfo.g_base_info_get_name(info) || 'UnknownObject';
  const fieldCount = objectInfo.g_object_info_get_n_fields(info);
  const fields = Array.from({ length: fieldCount })
    .map((_, i) => objectInfo.g_object_info_get_field(info, i))
    .map(unrefPassthrough(getFieldInfo));
  const methodCount = objectInfo.g_object_info_get_n_methods(info);
  const methods = Array.from({ length: methodCount })
    .map((_, i) => objectInfo.g_object_info_get_method(info, i))
    .map(unrefPassthrough(getFunctionInfo))

  const parentRef = gi.objectInfo.g_object_info_get_parent(info);
  const parent = parentRef.isNull() ? null : {
    name: gi.baseInfo.g_base_info_get_name(parentRef) || 'UnknownParent',
    namespace: gi.baseInfo.g_base_info_get_namespace(parentRef) || 'UnknownNamespace'
  }
  const abstract = gi.objectInfo.g_object_info_get_abstract(info);
  console.log('  object:', name, parent ? `extends ${parent.namespace}.${parent.name}` : '');

  const properties = Array.from({ length: gi.objectInfo.g_object_info_get_n_properties(info) })
    .map((_, i) => objectInfo.g_object_info_get_property(info, i))
    .map(unrefPassthrough(getPropertyInfo))
  const interfaces = Array.from({ length: gi.objectInfo.g_object_info_get_n_interfaces(info) })
    .map((_, i) => objectInfo.g_object_info_get_interface(info, i))
    .map(unrefPassthrough(getInterfaceInfo))
  const vfuncs = Array.from({ length: gi.objectInfo.g_object_info_get_n_vfuncs(info) })
    .map((_, i) => objectInfo.g_object_info_get_vfunc(info, i))
    .map(unrefPassthrough(getVFuncInfo))
  const signals = Array.from({ length: gi.objectInfo.g_object_info_get_n_signals(info) })
    .map((_, i) => objectInfo.g_object_info_get_signal(info, i))
    .map(unrefPassthrough(getSignalInfo))

  return {
    name,
    fields,
    methods,
    parent,
    abstract,
    properties,
    interfaces,
    vfuncs,
    signals,
  } as const;
}

export const getPropertyInfo = (info: InfoRef): PropertyInfo => {
  return {
    name: gi.baseInfo.g_base_info_get_name(info) || 'UnknownProperty',
  }
}
export const getSignalInfo = (info: InfoRef): SignalInfo => {
  const name = gi.baseInfo.g_base_info_get_name(info) || 'UnknownSignal';
  console.log('    signal:', name);
  return {
    name,
    ...getCallableInfo(info),
  }
}
export const getVFuncInfo = (info: InfoRef): VFuncInfo => {

  return {
    name: gi.baseInfo.g_base_info_get_name(info) || 'UnknownVFunc',
  }
}
export const getInterfaceInfo = (info: InfoRef): InterfaceInfo => {
  return {
    name: gi.baseInfo.g_base_info_get_name(info) || 'UnknownInterface',
  }
}
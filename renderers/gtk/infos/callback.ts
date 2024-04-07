import { InfoRef, gi } from "../lib";
import { CallableInfo, getCallableInfo } from "../write";

export type CallbackInfo = CallableInfo & {
  name: string,
};

export const getCallbackInfo = (ref: InfoRef) => {
  const name = gi.baseInfo.g_base_info_get_name(ref) || 'UnknownCallback';
  const callable = getCallableInfo(ref);
  console.log('    function:', name);
  return {
    ...callable,
    name,
  }
}
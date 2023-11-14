let latestId = 0;

declare const opaqueType: unique symbol;
export type OpaqueID<T extends string> = number & { readonly [opaqueType]: T };


/**
 * Produces a (relativley within this runtime) unique incrementing value
 */
export const createId = <T extends string>(): OpaqueID<T> => {
  return latestId++ as OpaqueID<T>;
};

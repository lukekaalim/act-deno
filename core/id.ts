let latestId = 0;

declare const opaqueType: unique symbol;

/**
 * A special abstraction over "number" that tries
 * to leverage type-saftey to specify when numbers
 * count as "ids". Create using `createId()`;
 */
export type OpaqueID<T extends string> = number & { readonly [opaqueType]: T };


/**
 * Produces a (relativley within this runtime, not globally) unique incrementing value
 */
export const createId = <T extends string>(): OpaqueID<T> => {
  return latestId++ as OpaqueID<T>;
};

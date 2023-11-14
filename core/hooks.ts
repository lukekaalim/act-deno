import { Context } from "./context.ts";
import { UnsetHookImplementation } from "./errors.ts";

export type HookImplementation = {
  useState: typeof useState;
  useEffect: typeof useEffect;
  useContext: typeof useContext;
};
const placeholderImplementation = () => {
  throw new UnsetHookImplementation();
};
export const hookImplementation: HookImplementation = {
  useState: placeholderImplementation,
  useEffect: placeholderImplementation,
  useContext: placeholderImplementation,
};

export type Deps = unknown[] | null;
export type ValueOrCalculator<T> =
  | Exclude<T, (...args: unknown[]) => unknown>
  | (() => T);

export const calculateValue = <T>(
  valueOrCalculator: ValueOrCalculator<T>
): T => {
  if (typeof valueOrCalculator === "function")
    return (valueOrCalculator as () => T)();
  return valueOrCalculator;
};
export const calculateDepsChange = (prev: Deps, next: Deps) => {
  if (!prev || !next) return true;
  return (
    prev.length !== next.length || prev.some((value, i) => value !== next[i])
  );
};
export const runUpdater = <T>(
  prev: T,
  updater: Updater<T>
): T => {
  if (typeof updater === "function")
    return (updater as (prev: T) => T)(prev);
  return updater;
};

/**
 * #### Use State
 *
 * Store a value inside the component state, and aquire
 * and function that can be used to update that value,
 * trigger a re-render.
 */
export const useState = <T>(
  initialValue: ValueOrCalculator<T>
): [T, StateSetter<T>] => {
  return hookImplementation.useState(initialValue);
};
export type StateSetter<T> = (updater: Updater<T>) => void;
export type Updater<T> = T | ((prev: T) => T);

/**
 * #### Use Effect
 *
 * Passing a function into this hook causes it to be run after
 * a render as a **side effect**. You define _which_ renders this
 * side effect triggers via second argument, a **Deps** array.
 */
export const useEffect = (effect: EffectConstructor, deps: Deps = []): void => {
  return hookImplementation.useEffect(effect, deps);
};
export type EffectConstructor = () => EffectCleanup;
export type EffectCleanup = void | (() => void)

/**
 * #### Use Context
 *
 * Retrieves the value that a *ContextProvider* may have set
 * earlier in the tree, or if there are none present,
 * returns the context's default value.
 */
export const useContext = <T>(context: Context<T>): T => {
  return hookImplementation.useContext(context);
};

export type Ref<T> = {
  current: T;
};

export const useRef = <T>(initialValue: ValueOrCalculator<T>): Ref<T> => {
  const [ref] = useState(() => ({ current: calculateValue(initialValue) }));
  return ref;
};
export const useMemo = <T>(calculate: () => T, deps: Deps): T => {
  const prevDeps = useRef(deps);
  const valueRef = useRef(calculate);

  if (calculateDepsChange(prevDeps.current, deps)) {
    prevDeps.current = deps;
    valueRef.current = calculate();
  }
  return valueRef.current;
};

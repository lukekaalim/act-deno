/**
 * Generically attempt to apply props to a target either by assigning them,
 * or letting a specialied function handle it.
 * 
 * Iterate across props from as to present, setting removed props to "undefined"
 */
export const setPropObject = (
  target: Record<string, unknown>,
  next: null | Record<string, unknown>,
  prev: null | Record<string, unknown>,
  assign: null | ((name: string, next: unknown, prev: unknown) => boolean) = null, 
) => {
  const names = new Set([
    ...Object.keys(next || {}),
    ...Object.keys(prev || {})
  ]);

  for (const name of names) {
    const nextValue = (next || {})[name];
    const successfulAssign = assign && assign(name, nextValue, (prev || {})[name]);
    if (!successfulAssign) {
      if (target[name] !== nextValue) {
        target[name] = nextValue;
      }
    }
  }
}
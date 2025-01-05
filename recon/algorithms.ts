import { MagicError } from "@lukekaalim/act";

export type ChangeReport = {
  /** Index for Next that didnt exist in Prev */
  created: number[],
  /** Index for Prev that didnt exist in Next */
  removed: number[],
  
  /** Index for elements that are the same previously and next */
  nextToPrev: number[],
};

export type ChangeEqualityTest<Prev, Next> = (prev: Prev, next: Next, prevIndex: number, nextIndex: number) => boolean;

export const calculateChangedElements = <Prev, Next>(
  prevs: Prev[],
  nexts: Next[],
  isEqual: ChangeEqualityTest<Prev, Next>,
): ChangeReport => {
  const report: ChangeReport = {
    created: [],
    removed: [],
    nextToPrev: [],
  }
  report.nextToPrev = nexts.map((next, nextIndex) => {
    const prevIndex = prevs.findIndex((prev, prevIndex) => isEqual(prev, next, prevIndex, nextIndex));
    if (prevIndex === -1)
      report.created.push(nextIndex);
    return prevIndex;
  });
  report.removed = prevs
    .map((_, index) => {
      return report.nextToPrev.indexOf(index) !== -1 ? -1 : index;
    })
    .filter((index) => index !== -1)
  
  return report;
}

export type SortedChangeReport = ChangeReport & {
  /** Index for elements that moved around, but were equal */
  moved: [number, number][],
};
export const calculateSortedChangedElements = (): SortedChangeReport => {
  throw new MagicError();
}

export const first = <X, Y>(array: ReadonlyArray<X>, func: (value: X, index: number) => Y | null): Y | null => {
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    const result = func(value, i);
    if (result !== null)
      return result;
  }
  return null;
}

export const last = <X, Y>(array: ReadonlyArray<X>, func: (value: X, index: number) => Y | null): Y | null => {
  for (let i = array.length - 1; i > 0; i--) {
    const value = array[i];
    const result = func(value, i);
    if (result !== null)
      return result;
  }
  return null;
}

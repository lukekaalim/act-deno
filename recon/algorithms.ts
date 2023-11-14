import { act } from "./deps.ts";

export type ChangeReport = {
  /** Index for Next that didnt exist in Prev */
  created: number[],
  /** Index for Prev that didnt exist in Next */
  removed: number[],
  
  /** Index for elements that are the same previously and next */
  nextToPrev: number[],
};

export const calculateChangedElements = <Prev, Next>(
  prevs: Prev[],
  nexts: Next[],
  isEqual: (prev: Prev, next: Next, prevIndex: number, nextIndex: number) => boolean,
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
  throw new act.MagicError();
}
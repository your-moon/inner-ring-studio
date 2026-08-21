/**
 * Slice a rectangular cell selection out of a grid's rows into the 2D matrix the
 * clipboard export expects.
 *
 * Pure: it reads only the header names + row objects the caller passes, so it
 * always reflects the SAME rows the selection came from. This is the fix for the
 * shadow-state bug — copy used to read the unfiltered source table at a filtered
 * view's row indices, yielding the wrong rows whenever a client-side column
 * filter was active.
 */
export interface CopyRange {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function sliceSelection(
  headerNames: string[],
  rows: Record<string, unknown>[],
  range: CopyRange
): unknown[][] {
  const cols = headerNames.filter((_, i) => i >= range.x1 && i <= range.x2);
  return rows
    .filter((_, i) => i >= range.y1 && i <= range.y2)
    .map((row) => cols.map((name) => row[name]));
}

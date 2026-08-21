import type { TableSelectionRange } from "./optimize-table-state";

/**
 * Pure geometry for the result grid's cell selection — merging, splitting, and
 * querying rectangular selection ranges. Extracted from OptimizeTableState so the
 * intricate merge/split algebra can be unit-tested without a live table or DOM.
 * Every function is a pure function of the ranges (plus row/column counts where a
 * "full row/column" is involved); none mutate their input.
 */

/** A range with corners in any order → normalized so (x1,y1) is the top-left. */
export function normalizeRange(
  y1: number,
  x1: number,
  y2: number,
  x2: number
): TableSelectionRange {
  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
  };
}

/**
 * Coalesce edge-adjacent ranges of matching span (a range immediately to the
 * right of, or below, one of equal extent) into single rectangles. Runs to a
 * fixed point, so order of the input does not matter.
 */
export function mergeRanges(
  input: TableSelectionRange[]
): TableSelectionRange[] {
  let ranges = input.map((r) => ({ ...r }));
  let mergedInPass = true;

  while (mergedInPass) {
    ranges.sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
    const merged: TableSelectionRange[] = [];
    mergedInPass = false;

    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (
        last &&
        ((last.y1 === range.y1 &&
          last.y2 === range.y2 &&
          last.x2 + 1 === range.x1) ||
          (last.x1 === range.x1 &&
            last.x2 === range.x2 &&
            last.y2 + 1 === range.y1))
      ) {
        last.x2 = Math.max(last.x2, range.x2);
        last.y2 = Math.max(last.y2, range.y2);
        mergedInPass = true;
      } else {
        merged.push({ ...range });
      }
    }
    ranges = merged;
  }

  return ranges;
}

/**
 * Subtract `deselection` from `selection`, returning the (0–4) rectangles of
 * `selection` that remain uncovered.
 */
export function splitRange(
  selection: TableSelectionRange,
  deselection: TableSelectionRange
): TableSelectionRange[] {
  const result: TableSelectionRange[] = [];

  if (deselection.y1 > selection.y1) {
    result.push({
      x1: selection.x1,
      y1: selection.y1,
      x2: selection.x2,
      y2: deselection.y1 - 1,
    });
  }
  if (deselection.y2 < selection.y2) {
    result.push({
      x1: selection.x1,
      y1: deselection.y2 + 1,
      x2: selection.x2,
      y2: selection.y2,
    });
  }
  if (deselection.x1 > selection.x1) {
    result.push({
      x1: selection.x1,
      y1: Math.max(selection.y1, deselection.y1),
      x2: deselection.x1 - 1,
      y2: Math.min(selection.y2, deselection.y2),
    });
  }
  if (deselection.x2 < selection.x2) {
    result.push({
      x1: deselection.x2 + 1,
      y1: Math.max(selection.y1, deselection.y1),
      x2: selection.x2,
      y2: Math.min(selection.y2, deselection.y2),
    });
  }

  return result;
}

/** Index of the first range that fully contains `range`, or -1. */
export function findContainingRangeIndex(
  ranges: TableSelectionRange[],
  range: TableSelectionRange
): number {
  return ranges.findIndex(
    (r) =>
      r.x1 <= range.x1 &&
      r.x2 >= range.x2 &&
      r.y1 <= range.y1 &&
      r.y2 >= range.y2
  );
}

/**
 * Toggle `newRange` into the selection: if it lands inside an existing range it
 * is subtracted (deselect); otherwise it is added. The result is re-merged.
 */
export function addRange(
  ranges: TableSelectionRange[],
  newRange: TableSelectionRange
): TableSelectionRange[] {
  const idx = findContainingRangeIndex(ranges, newRange);
  if (idx < 0) {
    return mergeRanges([...ranges, newRange]);
  }
  const containing = ranges[idx];
  const rest = ranges.filter((_, i) => i !== idx);
  return mergeRanges([...rest, ...splitRange(containing, newRange)]);
}

// ---- read queries ----

export function selectedRowIndexes(ranges: TableSelectionRange[]): number[] {
  const rows = new Set<number>();
  for (const range of ranges) {
    for (let i = range.y1; i <= range.y2; i++) rows.add(i);
  }
  return Array.from(rows.values());
}

export function selectedColIndexes(ranges: TableSelectionRange[]): number[] {
  const cols = new Set<number>();
  for (const range of ranges) {
    for (let i = range.x1; i <= range.x2; i++) cols.add(i);
  }
  return Array.from(cols.values());
}

export function isRowSelected(
  ranges: TableSelectionRange[],
  y: number
): boolean {
  return ranges.some((range) => y >= range.y1 && y <= range.y2);
}

/** The first range covering cell (y,x), or null. */
export function getContainingRange(
  ranges: TableSelectionRange[],
  y: number,
  x: number
): TableSelectionRange | null {
  for (const range of ranges) {
    if (y >= range.y1 && y <= range.y2 && x >= range.x1 && x <= range.x2) {
      return range;
    }
  }
  return null;
}

/** Selection membership + right/bottom borders for cell (y,x). Focus is separate. */
export function cellSelectionStatus(
  ranges: TableSelectionRange[],
  y: number,
  x: number
): { isSelected: boolean; isBorderRight: boolean; isBorderBottom: boolean } {
  let isSelected = false;
  let isBorderRight = false;
  let isBorderBottom = false;

  for (const range of ranges) {
    if (y >= range.y1 && y <= range.y2) {
      if (x >= range.x1 && x <= range.x2) isSelected = true;
      if (x === range.x2 || x + 1 === range.x1) isBorderRight = true;
    }
    if (x >= range.x1 && x <= range.x2) {
      if (y === range.y2 || y + 1 === range.y1) isBorderBottom = true;
    }
  }

  return { isSelected, isBorderRight, isBorderBottom };
}

/** A range is a "full row" when it spans every column 0..headerCount-1. */
export function isFullSelectionRow(
  ranges: TableSelectionRange[],
  y: number,
  headerCount: number
): boolean {
  return ranges.some(
    (range) =>
      range.y1 <= y &&
      range.y2 >= y &&
      range.x1 === 0 &&
      range.x2 === headerCount - 1
  );
}

export function isFullSelectionCol(
  ranges: TableSelectionRange[],
  x: number,
  rowCount: number
): boolean {
  return ranges.some(
    (range) =>
      range.x1 <= x &&
      range.x2 >= x &&
      range.y1 === 0 &&
      range.y2 === rowCount - 1
  );
}

export function fullSelectionRowIndexes(
  ranges: TableSelectionRange[],
  headerCount: number
): number[] {
  const rows = new Set<number>();
  for (const range of ranges) {
    if (range.x1 === 0 && range.x2 === headerCount - 1) {
      for (let i = range.y1; i <= range.y2; i++) rows.add(i);
    }
  }
  return Array.from(rows.values());
}

export function fullSelectionColIndexes(
  ranges: TableSelectionRange[],
  rowCount: number
): number[] {
  const cols = new Set<number>();
  for (const range of ranges) {
    if (range.y1 === 0 && range.y2 === rowCount - 1) {
      for (let i = range.x1; i <= range.x2; i++) cols.add(i);
    }
  }
  return Array.from(cols.values());
}

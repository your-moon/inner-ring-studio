/** @jest-environment node */
// The result grid's selection geometry — merge/split/toggle of rectangular
// ranges. This algebra used to live inside OptimizeTableState's protected
// methods, reachable only by mounting the grid; these tests are why it moved out.
import type { TableSelectionRange } from "./optimize-table-state";
import {
  addRange,
  cellSelectionStatus,
  findContainingRangeIndex,
  fullSelectionRowIndexes,
  getContainingRange,
  isFullSelectionRow,
  isRowSelected,
  mergeRanges,
  normalizeRange,
  selectedColIndexes,
  selectedRowIndexes,
  splitRange,
} from "./selection-ranges";

const r = (y1: number, x1: number, y2: number, x2: number): TableSelectionRange => ({
  x1,
  y1,
  x2,
  y2,
});

describe("selection-ranges geometry", () => {
  test("normalizeRange puts the top-left corner first", () => {
    expect(normalizeRange(5, 3, 1, 0)).toEqual({ x1: 0, y1: 1, x2: 3, y2: 5 });
  });

  test("mergeRanges coalesces horizontally-adjacent ranges of equal height", () => {
    // columns 0 and 1 of row 0, given separately, become one 0..1 range
    const merged = mergeRanges([r(0, 0, 0, 0), r(0, 1, 0, 1)]);
    expect(merged).toEqual([r(0, 0, 0, 1)]);
  });

  test("mergeRanges coalesces vertically-adjacent ranges of equal width", () => {
    const merged = mergeRanges([r(0, 0, 0, 2), r(1, 0, 1, 2)]);
    expect(merged).toEqual([r(0, 0, 1, 2)]);
  });

  test("mergeRanges runs to a fixed point regardless of input order", () => {
    // three single cells in a row, shuffled → one range
    const merged = mergeRanges([r(0, 2, 0, 2), r(0, 0, 0, 0), r(0, 1, 0, 1)]);
    expect(merged).toEqual([r(0, 0, 0, 2)]);
  });

  test("mergeRanges leaves non-adjacent ranges separate", () => {
    const merged = mergeRanges([r(0, 0, 0, 0), r(0, 2, 0, 2)]);
    expect(merged).toHaveLength(2);
  });

  test("splitRange subtracts a middle band, leaving top and bottom", () => {
    const pieces = splitRange(r(0, 0, 4, 2), r(2, 0, 2, 2));
    expect(pieces).toContainEqual(r(0, 0, 1, 2)); // above
    expect(pieces).toContainEqual(r(3, 0, 4, 2)); // below
    expect(pieces).toHaveLength(2);
  });

  test("findContainingRangeIndex finds the range that fully covers a cell", () => {
    const ranges = [r(0, 0, 2, 2), r(5, 5, 6, 6)];
    expect(findContainingRangeIndex(ranges, r(1, 1, 1, 1))).toBe(0);
    expect(findContainingRangeIndex(ranges, r(9, 9, 9, 9))).toBe(-1);
  });

  test("addRange appends a disjoint range and merges an adjacent one", () => {
    const added = addRange([r(0, 0, 0, 0)], r(0, 1, 0, 1));
    expect(added).toEqual([r(0, 0, 0, 1)]); // merged
    const disjoint = addRange([r(0, 0, 0, 0)], r(5, 5, 5, 5));
    expect(disjoint).toHaveLength(2);
  });

  test("addRange toggles off a cell already inside a selection (deselect)", () => {
    // select a 3x1 column, then click the middle cell → splits into two
    const start = [r(0, 0, 2, 0)];
    const toggled = addRange(start, r(1, 0, 1, 0));
    expect(toggled).toContainEqual(r(0, 0, 0, 0));
    expect(toggled).toContainEqual(r(2, 0, 2, 0));
    expect(toggled).not.toContainEqual(r(1, 0, 1, 0));
  });

  test("selectedRowIndexes / selectedColIndexes enumerate covered lines", () => {
    const ranges = [r(1, 0, 2, 1), r(4, 3, 4, 3)];
    expect(selectedRowIndexes(ranges).sort((a, b) => a - b)).toEqual([1, 2, 4]);
    expect(selectedColIndexes(ranges).sort((a, b) => a - b)).toEqual([0, 1, 3]);
  });

  test("isRowSelected and getContainingRange query membership", () => {
    const ranges = [r(1, 0, 2, 3)];
    expect(isRowSelected(ranges, 2)).toBe(true);
    expect(isRowSelected(ranges, 5)).toBe(false);
    expect(getContainingRange(ranges, 1, 2)).toBe(ranges[0]);
    expect(getContainingRange(ranges, 9, 9)).toBeNull();
  });

  test("cellSelectionStatus reports membership and right/bottom borders", () => {
    const ranges = [r(0, 0, 1, 1)]; // 2x2 block
    expect(cellSelectionStatus(ranges, 0, 0)).toMatchObject({ isSelected: true });
    // bottom-right cell is on both the right and bottom edge
    expect(cellSelectionStatus(ranges, 1, 1)).toEqual({
      isSelected: true,
      isBorderRight: true,
      isBorderBottom: true,
    });
    expect(cellSelectionStatus(ranges, 9, 9).isSelected).toBe(false);
  });

  test("full-row selection is recognized only when it spans every column", () => {
    const headerCount = 3; // columns 0..2
    const fullRow = [r(0, 0, 0, 2)];
    expect(isFullSelectionRow(fullRow, 0, headerCount)).toBe(true);
    expect(fullSelectionRowIndexes(fullRow, headerCount)).toEqual([0]);

    const partialRow = [r(0, 0, 0, 1)]; // misses the last column
    expect(isFullSelectionRow(partialRow, 0, headerCount)).toBe(false);
    expect(fullSelectionRowIndexes(partialRow, headerCount)).toEqual([]);
  });
});

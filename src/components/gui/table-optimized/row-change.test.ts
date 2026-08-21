/** @jest-environment node */
import { nextRowChange } from "./row-change";

describe("nextRowChange", () => {
  test("sets a value on a clean (untracked) row", () => {
    expect(nextRowChange(undefined, "a", 1, 2)).toEqual({ a: 2 });
  });

  test("adds a second edited cell to an already-dirty row", () => {
    expect(nextRowChange({ a: 2 }, "b", 5, 6)).toEqual({ a: 2, b: 6 });
  });

  test("updates an already-edited cell", () => {
    expect(nextRowChange({ a: 2 }, "a", 1, 9)).toEqual({ a: 9 });
  });

  test("reverting the only edited cell clears the row (undefined)", () => {
    expect(nextRowChange({ a: 2 }, "a", 1, 1)).toBeUndefined();
  });

  test("reverting one of several edits keeps the rest", () => {
    expect(nextRowChange({ a: 2, b: 6 }, "a", 1, 1)).toEqual({ b: 6 });
  });

  test("reverting a cell that was never edited leaves the change untouched", () => {
    const current = { b: 6 };
    expect(nextRowChange(current, "a", 1, 1)).toBe(current);
  });

  test("reverting on a clean row stays clean", () => {
    expect(nextRowChange(undefined, "a", 1, 1)).toBeUndefined();
  });

  test("does not mutate the input change", () => {
    const current = { a: 2 };
    nextRowChange(current, "a", 1, 1);
    nextRowChange(current, "b", 5, 6);
    expect(current).toEqual({ a: 2 });
  });

  test("uses deep equality for the revert check (objects, null)", () => {
    expect(nextRowChange({ a: 2 }, "a", { x: 1 }, { x: 1 })).toBeUndefined();
    expect(nextRowChange(undefined, "a", null, null)).toBeUndefined();
  });
});

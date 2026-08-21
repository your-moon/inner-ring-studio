/** @jest-environment node */
import {
  canGoPrev,
  nextOffset,
  parsePageValue,
  prevOffset,
} from "./table-pagination";

describe("table pagination controls", () => {
  test("parsePageValue reads a clean number", () => {
    expect(parsePageValue("50", 10)).toBe(50);
    expect(parsePageValue("  10 ", 99)).toBe(10);
  });

  test("parsePageValue returns the fallback for non-numeric / empty input", () => {
    // the bug this fixes: parseInt('abc') is NaN, not a throw, so NaN used to
    // flow straight into the query as limit/offset.
    expect(parsePageValue("abc", 42)).toBe(42);
    expect(parsePageValue("", 42)).toBe(42);
  });

  test("parsePageValue clamps a negative number to 0", () => {
    expect(parsePageValue("-5", 10)).toBe(0);
  });

  test("prevOffset never goes below 0", () => {
    // the bug this fixes: at offset 30 / limit 50, prev used to compute -20.
    expect(prevOffset(30, 50)).toBe(0);
    expect(prevOffset(100, 50)).toBe(50);
  });

  test("nextOffset steps forward by the limit", () => {
    expect(nextOffset(0, 50)).toBe(50);
    expect(nextOffset(50, 50)).toBe(100);
  });

  test("canGoPrev is false only at the first page", () => {
    expect(canGoPrev(0)).toBe(false);
    expect(canGoPrev(1)).toBe(true);
  });
});

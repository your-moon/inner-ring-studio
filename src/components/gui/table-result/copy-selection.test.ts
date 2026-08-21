/** @jest-environment node */
import { sliceSelection } from "./copy-selection";

const rows: Record<string, unknown>[] = [
  { id: 1, name: "alice", city: "paris" },
  { id: 2, name: "bob", city: "rome" },
  { id: 3, name: "cara", city: "oslo" },
];
const headers = ["id", "name", "city"];

describe("sliceSelection", () => {
  test("cuts the rectangle bounded by the range (inclusive)", () => {
    // rows 1..2, columns 1..2 → name+city of bob & cara
    expect(sliceSelection(headers, rows, { y1: 1, y2: 2, x1: 1, x2: 2 })).toEqual([
      ["bob", "rome"],
      ["cara", "oslo"],
    ]);
  });

  test("a single-column range yields one value per row", () => {
    expect(sliceSelection(headers, rows, { y1: 0, y2: 2, x1: 0, x2: 0 })).toEqual([
      [1],
      [2],
      [3],
    ]);
  });

  test("reads rows by the SAME index space it is given (filtered view safety)", () => {
    // The caller passes the VISIBLE rows; index 0 must be the first visible row,
    // never the first row of some other (unfiltered) table.
    const filtered = [rows[2]]; // e.g. only 'cara' matched a filter
    expect(sliceSelection(headers, filtered, { y1: 0, y2: 0, x1: 1, x2: 1 })).toEqual([
      ["cara"],
    ]);
  });
});

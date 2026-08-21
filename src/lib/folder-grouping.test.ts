/** @jest-environment node */
import { groupByFolder } from "./folder-grouping";

const c = (name: string, folder?: string | null) => ({ name, folder });

describe("groupByFolder", () => {
  test("buckets items by trimmed folder, ungrouped under the empty key", () => {
    const { groups } = groupByFolder([
      c("a", "Prod"),
      c("b"),
      c("c", "  Prod  "), // trims to the same folder as 'a'
      c("d", "   "), // blank → ungrouped
    ]);
    expect(groups.get("Prod")!.map((x) => x.name)).toEqual(["a", "c"]);
    expect(groups.get("")!.map((x) => x.name)).toEqual(["b", "d"]);
  });

  test("keys put the ungrouped bucket first, then alphabetical", () => {
    const { keys } = groupByFolder([
      c("a", "Zeta"),
      c("b", "alpha"),
      c("c"), // ungrouped
      c("d", "Beta"),
    ]);
    expect(keys[0]).toBe("");
    expect(keys.slice(1)).toEqual(["alpha", "Beta", "Zeta"]);
  });

  test("preserves input order within a group", () => {
    const { groups } = groupByFolder([c("x", "F"), c("y", "F"), c("z", "F")]);
    expect(groups.get("F")!.map((i) => i.name)).toEqual(["x", "y", "z"]);
  });

  test("an empty list yields no keys", () => {
    expect(groupByFolder([]).keys).toEqual([]);
  });

  test("a missing folder field is treated as ungrouped", () => {
    const { groups } = groupByFolder([c("a", null), c("b", undefined)]);
    expect(groups.get("")!.map((i) => i.name)).toEqual(["a", "b"]);
  });
});

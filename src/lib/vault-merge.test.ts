/** @jest-environment node */
import { mergeVaults, type MergeableVault } from "./vault-merge";

const conn = (id: string, updatedAt: number, extra: Record<string, unknown> = {}) => ({
  id,
  updatedAt,
  ...extra,
});
const v = (
  connections: ReturnType<typeof conn>[],
  tombstones: { id: string; deletedAt: number }[] = []
): MergeableVault => ({ connections, tombstones });

const ids = (r: { connections: { id: string }[] }) => r.connections.map((c) => c.id);

describe("mergeVaults", () => {
  test("unions connections that exist only on one side", () => {
    const r = mergeVaults(v([conn("a", 1)]), v([conn("b", 1)]));
    expect(ids(r)).toEqual(["a", "b"]);
  });

  test("last-writer-wins per id by updatedAt", () => {
    const r = mergeVaults(
      v([conn("a", 10, { name: "old" })]),
      v([conn("a", 20, { name: "new" })])
    );
    expect(r.connections).toEqual([{ id: "a", updatedAt: 20, name: "new" }]);
  });

  test("a tombstone newer than the connection deletes it", () => {
    const r = mergeVaults(
      v([conn("a", 10)]), // still present on peer A
      v([], [{ id: "a", deletedAt: 15 }]) // deleted on peer B, later
    );
    expect(ids(r)).toEqual([]);
    expect(r.tombstones).toEqual([{ id: "a", deletedAt: 15 }]);
  });

  test("an edit made after a delete resurrects the connection", () => {
    const r = mergeVaults(
      v([conn("a", 30, { name: "revived" })]), // edited at 30
      v([], [{ id: "a", deletedAt: 20 }]) // deleted at 20 (earlier)
    );
    expect(r.connections).toEqual([{ id: "a", updatedAt: 30, name: "revived" }]);
    expect(r.tombstones).toEqual([]);
  });

  test("the newest tombstone wins across sides", () => {
    const r = mergeVaults(
      v([], [{ id: "a", deletedAt: 5 }]),
      v([], [{ id: "a", deletedAt: 9 }])
    );
    expect(r.tombstones).toEqual([{ id: "a", deletedAt: 9 }]);
  });

  test("is commutative: merge(a,b) deep-equals merge(b,a)", () => {
    const a = v(
      [conn("x", 5, { v: 1 }), conn("y", 2)],
      [{ id: "z", deletedAt: 8 }]
    );
    const b = v(
      [conn("x", 9, { v: 2 }), conn("z", 3)],
      [{ id: "y", deletedAt: 1 }]
    );
    expect(mergeVaults(a, b)).toEqual(mergeVaults(b, a));
  });

  test("is idempotent: merge(x, x) equals normalized x", () => {
    const x = v([conn("b", 2), conn("a", 1)], [{ id: "c", deletedAt: 4 }]);
    const once = mergeVaults(x, x);
    expect(once).toEqual(mergeVaults(once, once));
    expect(ids(once)).toEqual(["a", "b"]); // sorted, stable
  });

  test("equal-timestamp conflicts resolve deterministically (order-independent)", () => {
    const a = v([conn("a", 7, { name: "alpha" })]);
    const b = v([conn("a", 7, { name: "beta" })]);
    expect(mergeVaults(a, b)).toEqual(mergeVaults(b, a));
    expect(mergeVaults(a, b).connections).toHaveLength(1);
  });

  test("empty vaults merge to empty", () => {
    expect(mergeVaults(v([]), v([]))).toEqual({ connections: [], tombstones: [] });
  });
});

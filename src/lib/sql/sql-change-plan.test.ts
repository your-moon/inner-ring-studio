/** @jest-environment node */
// The DML write path: turning a grid's changed rows into INSERT/UPDATE/DELETE
// plans keyed by primary key. A wrong WHERE here is silent row-level data loss,
// so this is the single highest-value unit to pin down — now a pure function of
// the changed rows, testable with plain objects.
import type {
  DatabaseTableSchema,
  DatabaseTableOperation,
} from "@/drivers/base-driver";
import type { OptimizeTableRowValue } from "@/components/gui/table-optimized/optimize-table-state";
import { generateTableChangePlan } from "./sql-change-plan";

const schema = (over: Partial<DatabaseTableSchema> = {}): DatabaseTableSchema => ({
  columns: [],
  pk: ["id"],
  autoIncrement: false,
  schemaName: "public",
  tableName: "t",
  ...over,
});

const plan = (rows: OptimizeTableRowValue[], over?: Partial<DatabaseTableSchema>) =>
  generateTableChangePlan({ tableSchema: schema(over), rows }).map((p) => p.plan);

const asUpdate = (p: DatabaseTableOperation) =>
  p as { where: Record<string, unknown>; values?: Record<string, unknown> };
const asInsert = (p: DatabaseTableOperation) =>
  p as Extract<DatabaseTableOperation, { operation: "INSERT" }>;

describe("generateTableChangePlan — DML write path", () => {
  test("an edited existing row becomes an UPDATE keyed by its original PK", () => {
    const [p] = plan([{ raw: { id: 5, name: "old" }, change: { name: "new" } }]);
    expect(p.operation).toBe("UPDATE");
    expect(asUpdate(p).where).toEqual({ id: 5 });
    expect(asUpdate(p).values).toEqual({ name: "new" });
  });

  test("editing the PK column still locates the row by its ORIGINAL PK", () => {
    // The dangerous case: WHERE must use raw (old) PK, not the new value, or the
    // UPDATE hits the wrong row (or none).
    const [p] = plan([{ raw: { id: 5 }, change: { id: 99, name: "x" } }]);
    expect(asUpdate(p).where).toEqual({ id: 5 });
    expect(asUpdate(p).values).toEqual({ id: 99, name: "x" });
  });

  test("a removed row becomes a DELETE keyed by original PK", () => {
    const [p] = plan([{ raw: { id: 7 }, change: {}, isRemoved: true }]);
    expect(p.operation).toBe("DELETE");
    expect(asUpdate(p).where).toEqual({ id: 7 });
  });

  test("a new row becomes an INSERT carrying the entered values + pk", () => {
    const [p] = plan([{ raw: {}, change: { name: "x" }, isNewRow: true }]);
    expect(p.operation).toBe("INSERT");
    const ins = asInsert(p);
    expect(ins.values).toEqual({ name: "x" });
    expect(ins.pk).toEqual(["id"]);
    expect(ins.autoIncrementPkColumn).toBeUndefined();
  });

  test("INSERT flags the auto-increment PK column when the table has one", () => {
    const [p] = plan(
      [{ raw: {}, change: { name: "x" }, isNewRow: true }],
      { autoIncrement: true }
    );
    expect(p.operation).toBe("INSERT");
    expect(asInsert(p).autoIncrementPkColumn).toBe("id");
  });

  test("a composite PK puts every key column in the WHERE", () => {
    const [p] = plan(
      [{ raw: { a: 1, b: 2, v: 0 }, change: { v: 9 } }],
      { pk: ["a", "b"] }
    );
    expect(asUpdate(p).where).toEqual({ a: 1, b: 2 });
  });

  test("rows with no pending change are skipped", () => {
    const plans = plan([
      { raw: { id: 1 } }, // no change
      { raw: { id: 2, n: "a" }, change: { n: "b" } },
    ]);
    expect(plans).toHaveLength(1);
    expect(asUpdate(plans[0]).where).toEqual({ id: 2 });
  });

  test("new-then-removed and edited rows all appear, in order", () => {
    const plans = plan([
      { raw: {}, change: { n: "new" }, isNewRow: true },
      { raw: { id: 2, n: "x" }, change: { n: "y" } },
      { raw: { id: 3 }, change: {}, isRemoved: true },
    ]);
    expect(plans.map((p) => p.operation)).toEqual(["INSERT", "UPDATE", "DELETE"]);
  });
});

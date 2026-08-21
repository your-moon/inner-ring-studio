import { assembleResultSet, normalizeCellJson } from "./result-set";

const col = (name: string, type = 1, originalType: string | null = null) => ({
  name,
  originalType,
  type,
});

describe("assembleResultSet", () => {
  it("keys rows by header name", () => {
    const rs = assembleResultSet(
      [col("id", 2, "int4"), col("name", 1, "text")],
      [
        [1, "a"],
        [2, "b"],
      ]
    );
    expect(rs.headers.map((h) => h.name)).toEqual(["id", "name"]);
    expect(rs.rows).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ]);
  });

  it("de-duplicates repeated column names to __name_i (displayName kept)", () => {
    const rs = assembleResultSet([col("x"), col("x"), col("x")], [["a", "b", "c"]]);
    expect(rs.headers.map((h) => h.name)).toEqual(["x", "__x_0", "__x_1"]);
    expect(rs.headers.every((h) => h.displayName === "x")).toBe(true);
    expect(rs.rows[0]).toEqual({ x: "a", __x_0: "b", __x_1: "c" });
  });

  it("applies normalizeCell when given, else passes cells through", () => {
    const normalized = assembleResultSet([col("j")], [[{ a: 1 }]], {
      normalizeCell: normalizeCellJson,
    });
    expect(normalized.rows[0].j).toBe('{"a":1}');

    const raw = assembleResultSet([col("j")], [[{ a: 1 }]]);
    expect(raw.rows[0].j).toEqual({ a: 1 });
  });

  it("defaults rowsAffected to the row count, or takes the override", () => {
    expect(assembleResultSet([col("a")], [[1], [2]]).stat.rowsAffected).toBe(2);
    expect(assembleResultSet([], [], { rowsAffected: 5 }).stat.rowsAffected).toBe(
      5
    );
  });

  it("carries the dialect's originalType/type onto the header", () => {
    const rs = assembleResultSet([col("c", 3, "Float64")], [[1.5]]);
    expect(rs.headers[0]).toMatchObject({ originalType: "Float64", type: 3 });
  });
});

describe("normalizeCellJson", () => {
  it("passes primitives and null/undefined through", () => {
    expect(normalizeCellJson(null)).toBeNull();
    expect(normalizeCellJson(undefined)).toBeUndefined();
    expect(normalizeCellJson(42)).toBe(42);
    expect(normalizeCellJson("s")).toBe("s");
  });

  it("keeps Buffers as-is (rendered as binary)", () => {
    const b = Buffer.from("x");
    expect(normalizeCellJson(b)).toBe(b);
  });

  it("stringifies arrays and objects to JSON text", () => {
    expect(normalizeCellJson([1, 2])).toBe("[1,2]");
    expect(normalizeCellJson({ a: 1 })).toBe('{"a":1}');
  });
});

import { wrapForTopN } from "./sql-topn";

/**
 * wrapForTopN silently rewrites what the user runs, so it must be paranoid:
 * append a LIMIT only when doing so cannot change the result set.
 */
describe("wrapForTopN", () => {
  const N = 1000;

  it("appends LIMIT to a plain SELECT", () => {
    expect(wrapForTopN("SELECT * FROM t", N)).toBe("SELECT * FROM t LIMIT 1000");
  });

  it("appends after ORDER BY (so the index-backed top-N applies)", () => {
    expect(wrapForTopN("select * from t order by created_at desc", N)).toBe(
      "select * from t order by created_at desc LIMIT 1000"
    );
  });

  it("strips a trailing semicolon before appending", () => {
    expect(wrapForTopN("SELECT * FROM t;", N)).toBe("SELECT * FROM t LIMIT 1000");
  });

  it("leaves a query that already has LIMIT untouched", () => {
    expect(wrapForTopN("SELECT * FROM t LIMIT 5", N)).toBe("SELECT * FROM t LIMIT 5");
    expect(wrapForTopN("SELECT * FROM t OFFSET 10", N)).toBe("SELECT * FROM t OFFSET 10");
  });

  it("never touches non-SELECT statements", () => {
    for (const sql of [
      "UPDATE t SET x = 1",
      "DELETE FROM t",
      "INSERT INTO t VALUES (1)",
      "WITH c AS (SELECT 1) SELECT * FROM c", // CTE — not a bare SELECT prefix
    ]) {
      expect(wrapForTopN(sql, N)).toBe(sql);
    }
  });

  it("refuses multi-statement input", () => {
    const sql = "SELECT * FROM t; DROP TABLE t";
    expect(wrapForTopN(sql, N)).toBe(sql);
  });

  it("refuses locking and SELECT INTO", () => {
    expect(wrapForTopN("SELECT * FROM t FOR UPDATE", N)).toBe("SELECT * FROM t FOR UPDATE");
    expect(wrapForTopN("SELECT * INTO backup FROM t", N)).toBe("SELECT * INTO backup FROM t");
  });
});

import {
  discoverPlaceholders,
  prepareStatements,
  sqlAltersSchema,
  withExplain,
} from "./query-plan";

describe("withExplain", () => {
  it("prefixes per dialect", () => {
    expect(withExplain("select 1", "sqlite")).toBe("explain query plan select 1");
    expect(withExplain("select 1", "mysql")).toBe("explain format=json select 1");
    expect(withExplain("select 1", "postgres")).toBe(
      "explain (format json) select 1"
    );
  });

  it("leaves an already-explained sqlite statement alone", () => {
    expect(withExplain("explain query plan select 1", "sqlite")).toBe(
      "explain query plan select 1"
    );
  });

  it("returns the statement unchanged for an unknown dialect", () => {
    expect(withExplain("select 1", "duckdb")).toBe("select 1");
  });
});

describe("sqlAltersSchema", () => {
  const on = { supportUseStatement: true };
  it("detects CREATE / DROP by leading keyword (case + whitespace insensitive)", () => {
    expect(sqlAltersSchema([{ sql: "  CREATE TABLE t(id int)" }], on)).toBe(true);
    expect(sqlAltersSchema([{ sql: "drop table t" }], on)).toBe(true);
  });

  it("detects USE only when the dialect supports it", () => {
    expect(sqlAltersSchema([{ sql: "USE mydb" }], { supportUseStatement: true })).toBe(true);
    expect(sqlAltersSchema([{ sql: "USE mydb" }], { supportUseStatement: false })).toBe(false);
  });

  it("does not fire for reads (or ALTER, which it intentionally ignores)", () => {
    expect(
      sqlAltersSchema(
        [{ sql: "select 1" }, { sql: "alter table t add c int" }],
        on
      )
    ).toBe(false);
  });
});

describe("discoverPlaceholders", () => {
  it("finds :placeholder names", () => {
    expect(
      discoverPlaceholders(
        "select * from t where id = :id and s = :status",
        "postgres"
      )
    ).toEqual(["id", "status"]);
  });

  it("returns [] when there are none", () => {
    expect(discoverPlaceholders("select 1", "postgres")).toEqual([]);
  });
});

describe("prepareStatements", () => {
  it("keeps placeholder values out of history but substitutes them into run", () => {
    const r = prepareStatements(["select :id"], {
      dialect: "postgres",
      explained: false,
      placeholders: { id: "5" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.history).toEqual(["select :id"]);
      expect(r.run[0]).toContain("5");
      expect(r.run[0]).not.toContain(":id");
    }
  });

  it("explain-prefixes when explained", () => {
    const r = prepareStatements(["select 1"], {
      dialect: "sqlite",
      explained: true,
      placeholders: {},
    });
    expect(r.ok && r.history[0]).toBe("explain query plan select 1");
  });

  it("fails (ok:false) when a referenced placeholder is unfilled", () => {
    const r = prepareStatements(["select :id"], {
      dialect: "postgres",
      explained: false,
      placeholders: { id: "" },
    });
    expect(r).toMatchObject({
      ok: false,
      message: "Please fill in all placeholders",
    });
  });
});

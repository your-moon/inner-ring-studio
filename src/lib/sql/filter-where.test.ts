/** @jest-environment node */
import { buildFilterWhere } from "./filter-where";

// Predictable stand-in for a driver's escapeSqlValue: single-quote + double any
// embedded quotes. Structure is what we assert; real value-escaping is the
// driver's own concern.
const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;

const build = (
  dialect: string,
  where: string,
  filters: Record<string, string>
) => buildFilterWhere(dialect, where, filters, esc);

describe("buildFilterWhere", () => {
  test("no filter and no manual where yields an empty clause", () => {
    expect(build("postgres", "", {})).toBe("");
  });

  test("postgres uses case-insensitive CAST(... AS TEXT) ILIKE", () => {
    expect(build("postgres", "", { name: "al" })).toBe(
      `CAST("name" AS TEXT) ILIKE '%al%'`
    );
  });

  test("mysql uses backtick identifiers and LIKE", () => {
    expect(build("mysql", "", { name: "al" })).toBe("`name` LIKE '%al%'");
  });

  test("clickhouse (and other non-pg/mysql) uses double-quoted LIKE", () => {
    expect(build("clickhouse", "", { name: "al" })).toBe(`"name" LIKE '%al%'`);
  });

  test("the manual where is wrapped in parens and AND-ed before column filters", () => {
    expect(build("postgres", "id > 10", { name: "al" })).toBe(
      `(id > 10) AND CAST("name" AS TEXT) ILIKE '%al%'`
    );
  });

  test("multiple column filters are AND-ed together", () => {
    const out = build("mysql", "", { a: "x", b: "y" });
    expect(out).toBe("`a` LIKE '%x%' AND `b` LIKE '%y%'");
  });

  test("blank / whitespace-only terms are skipped", () => {
    expect(build("postgres", "   ", { name: "  " })).toBe("");
  });

  test("identifiers are escaped for the dialect (injection surface)", () => {
    // a column name carrying the dialect's own quote char must be doubled
    expect(build("mysql", "", { "a`b": "x" })).toBe("`a``b` LIKE '%x%'");
    expect(build("postgres", "", { 'a"b': "x" })).toBe(
      `CAST("a""b" AS TEXT) ILIKE '%x%'`
    );
  });
});

import { buildRulesWhere, ruleLabel } from "./filter-where";

describe("buildRulesWhere", () => {
  it("compiles comparisons with numeric passthrough", () => {
    expect(
      buildRulesWhere("postgres", [{ column: "id", op: ">", value: "5" }], esc)
    ).toBe('"id" > 5');
  });
  it("quotes non-numeric values", () => {
    expect(
      buildRulesWhere("postgres", [{ column: "name", op: "=", value: "Bolt" }], esc)
    ).toBe("\"name\" = 'Bolt'");
  });
  it("contains uses ILIKE on postgres and LIKE on mysql", () => {
    expect(
      buildRulesWhere("postgres", [{ column: "name", op: "contains", value: "bo" }], esc)
    ).toBe("CAST(\"name\" AS TEXT) ILIKE '%bo%'");
    expect(
      buildRulesWhere("mysql", [{ column: "name", op: "contains", value: "bo" }], esc)
    ).toBe("`name` LIKE '%bo%'");
  });
  it("null checks take no value", () => {
    expect(
      buildRulesWhere("postgres", [{ column: "notes", op: "is null" }], esc)
    ).toBe('"notes" IS NULL');
  });
  it("raw rules are parenthesized verbatim", () => {
    expect(
      buildRulesWhere("postgres", [{ column: "", op: "raw", value: "id % 2 = 0" }], esc)
    ).toBe("(id % 2 = 0)");
  });
  it("escapes hostile identifiers and values", () => {
    expect(
      buildRulesWhere(
        "postgres",
        [{ column: 'a"b', op: "=", value: "x' OR 1=1 --" }],
        esc
      )
    ).toBe("\"a\"\"b\" = 'x'' OR 1=1 --'");
  });
  it("ANDs multiple rules", () => {
    expect(
      buildRulesWhere(
        "postgres",
        [
          { column: "id", op: ">=", value: "10" },
          { column: "notes", op: "is not null" },
        ],
        esc
      )
    ).toBe('"id" >= 10 AND "notes" IS NOT NULL');
  });
});

describe("ruleLabel", () => {
  it("labels each op family", () => {
    expect(ruleLabel({ column: "id", op: ">", value: "5" })).toBe("id > 5");
    expect(ruleLabel({ column: "n", op: "contains", value: "bo" })).toBe(
      "n contains “bo”"
    );
    expect(ruleLabel({ column: "n", op: "is null" })).toBe("n is null");
    expect(ruleLabel({ column: "", op: "raw", value: "id % 2 = 0" })).toBe(
      "id % 2 = 0"
    );
  });
});

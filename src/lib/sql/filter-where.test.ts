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

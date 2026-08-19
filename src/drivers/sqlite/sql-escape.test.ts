import { escapeSqlString, escapeSqlValue } from "./sql-helper";

/**
 * Grid write-back builds SQL by escaping values (the upstream model),
 * not bound params. That makes escaping the injection boundary: a cell value
 * carrying a quote or a statement terminator must end up as a literal, never as
 * SQL. These tests pin that.
 */
describe("escapeSqlString", () => {
  it("wraps and doubles single quotes", () => {
    expect(escapeSqlString("O'Brien")).toBe("'O''Brien'");
  });

  it("neutralizes a classic injection payload as a literal", () => {
    // The apostrophe is doubled, so the trailing SQL stays inside the string.
    expect(escapeSqlString("'); DROP TABLE users;--")).toBe(
      "'''); DROP TABLE users;--'"
    );
  });

  it("leaves an already-safe string wrapped once", () => {
    expect(escapeSqlString("hello")).toBe("'hello'");
  });
});

describe("escapeSqlValue", () => {
  it("maps null/undefined to NULL/DEFAULT", () => {
    expect(escapeSqlValue(null)).toBe("NULL");
    expect(escapeSqlValue(undefined)).toBe("DEFAULT");
  });

  it("emits numbers bare and strings quoted", () => {
    expect(escapeSqlValue(42)).toBe("42");
    expect(escapeSqlValue("42")).toBe("'42'");
  });

  it("escapes a quote inside a string value", () => {
    expect(escapeSqlValue("a'b")).toBe("'a''b'");
  });
});

/** @jest-environment node */
import { getSingleTableName } from "./single-table-name";

describe("getSingleTableName", () => {
  test("returns the sole table of a simple SELECT (normalized to lowercase)", () => {
    expect(getSingleTableName("SELECT * FROM Users")).toBe("users");
    expect(getSingleTableName("select id, name from orders where id > 3")).toBe(
      "orders"
    );
  });

  test("keeps a schema-qualified name intact", () => {
    expect(getSingleTableName("SELECT * FROM public.users")).toBe("public.users");
  });

  test("returns null when a JOIN references a second table", () => {
    expect(
      getSingleTableName("SELECT * FROM a JOIN b ON a.id = b.a_id")
    ).toBeNull();
  });

  test("returns null for a comma-separated multi-table FROM", () => {
    expect(getSingleTableName("SELECT * FROM a, b")).toBeNull();
  });

  test("returns null when there is no FROM clause", () => {
    expect(getSingleTableName("SELECT 1")).toBeNull();
    expect(getSingleTableName("")).toBeNull();
  });

  test("stops at the table token before a trailing clause or semicolon", () => {
    expect(getSingleTableName("SELECT * FROM users;")).toBe("users");
    expect(getSingleTableName("SELECT * FROM users ORDER BY id")).toBe("users");
  });
});

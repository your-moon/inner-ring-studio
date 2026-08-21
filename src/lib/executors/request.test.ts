import { decodeQueryRequest } from "./request";

describe("decodeQueryRequest", () => {
  it("decodes a close request", () => {
    expect(decodeQueryRequest({ closeCursorId: "c1" })).toEqual({
      kind: "close",
      cursorId: "c1",
    });
  });

  it("decodes a fetch-more request and clamps the page size", () => {
    const r = decodeQueryRequest({ cursorId: "c1", fetchMore: 5 });
    expect(r.kind).toBe("fetchMore");
    if (r.kind === "fetchMore") {
      expect(r.cursorId).toBe("c1");
      // clampPageSize floors small values to its minimum (50)
      expect(r.pageSize).toBeGreaterThanOrEqual(50);
    }
  });

  it("decodes a statements (transaction) request", () => {
    expect(decodeQueryRequest({ statements: ["a", "b"] })).toEqual({
      kind: "statements",
      statements: ["a", "b"],
    });
  });

  it("errors when sql is missing and no other verb matches", () => {
    expect(decodeQueryRequest({})).toEqual({
      kind: "error",
      message: "Missing sql",
    });
  });

  it("decodes paginate when paginate is present (before single)", () => {
    const r = decodeQueryRequest({ sql: "select 1", paginate: 100 });
    expect(r.kind).toBe("paginate");
    if (r.kind === "paginate") expect(r.sql).toBe("select 1");
  });

  it("decodes a single statement", () => {
    expect(decodeQueryRequest({ sql: "select 1" })).toEqual({
      kind: "single",
      sql: "select 1",
    });
  });

  it("prefers close over every other verb", () => {
    const r = decodeQueryRequest({
      closeCursorId: "c",
      cursorId: "x",
      fetchMore: 1,
      statements: ["a"],
      sql: "select 1",
      paginate: 10,
    });
    expect(r.kind).toBe("close");
  });

  it("matches statements before the missing-sql check (empty array counts)", () => {
    expect(decodeQueryRequest({ statements: [] }).kind).toBe("statements");
  });

  it("ignores a stray cursorId with no fetchMore", () => {
    // cursorId alone is not a fetch-more; falls through to sql handling
    expect(decodeQueryRequest({ cursorId: "x", sql: "select 1" }).kind).toBe(
      "single"
    );
  });
});

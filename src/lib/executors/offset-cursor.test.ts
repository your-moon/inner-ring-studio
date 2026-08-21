import {
  decodeOffsetCursor,
  encodeOffsetCursor,
  pageableSelect,
} from "./offset-cursor";

describe("offset cursor codec", () => {
  it("round-trips sql + offset", () => {
    const token = encodeOffsetCursor("select * from t", 100);
    expect(decodeOffsetCursor(token)).toEqual({
      sql: "select * from t",
      offset: 100,
    });
  });

  it("returns null for a malformed token", () => {
    expect(decodeOffsetCursor("!!!not json at all")).toBeNull();
  });

  it("returns null when fields have the wrong types", () => {
    const bad = Buffer.from(
      JSON.stringify({ sql: 1, offset: "x" })
    ).toString("base64url");
    expect(decodeOffsetCursor(bad)).toBeNull();
  });
});

describe("pageableSelect", () => {
  it("accepts a plain SELECT, trimmed and ;-stripped", () => {
    expect(pageableSelect("  SELECT * FROM t;  ")).toBe("SELECT * FROM t");
  });

  it("accepts a WITH (CTE)", () => {
    expect(pageableSelect("with x as (select 1) select * from x")).toMatch(
      /^with/i
    );
  });

  it("rejects a non-select", () => {
    expect(pageableSelect("show tables")).toBeNull();
  });

  it("rejects an explicit LIMIT/OFFSET", () => {
    expect(pageableSelect("select * from t limit 10")).toBeNull();
  });

  it("rejects a FORMAT clause", () => {
    expect(pageableSelect("select * from t format JSON")).toBeNull();
  });
});

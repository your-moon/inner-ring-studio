import { fuzzyRank, fuzzyScore } from "./fuzzy-rank";

describe("fuzzyScore", () => {
  it("scores an empty query as 0 (no filtering)", () => {
    expect(fuzzyScore("orders", "")).toBe(0);
  });

  it("scores an exact match (case-insensitive) as 0", () => {
    expect(fuzzyScore("Orders", "orders")).toBe(0);
  });

  it("scores a prefix as 1", () => {
    expect(fuzzyScore("orders_2024", "ord")).toBe(1);
  });

  it("scores a substring as 2 + idx/1000", () => {
    expect(fuzzyScore("my_orders", "orders")).toBeCloseTo(2 + 3 / 1000, 6);
  });

  it("scores a scattered subsequence as 5", () => {
    // o, d, r appear in order but never contiguously ("odr" is not a substring)
    expect(fuzzyScore("order", "odr")).toBe(5);
  });

  it("scores a non-match as Infinity", () => {
    expect(fuzzyScore("abc", "xyz")).toBe(Infinity);
  });

  it("ranks a prefix above a later substring", () => {
    expect(fuzzyScore("order", "or")).toBeLessThan(fuzzyScore("worker", "or"));
  });
});

describe("fuzzyRank", () => {
  const items = [
    { t: "customers" },
    { t: "orders" },
    { t: "order_items" },
    { t: "payments" },
  ];
  const get = (x: { t: string }) => x.t;

  it("preserves caller order for an empty query", () => {
    expect(fuzzyRank(items, get, "").map(get)).toEqual([
      "customers",
      "orders",
      "order_items",
      "payments",
    ]);
  });

  it("respects the limit for an empty query", () => {
    expect(fuzzyRank(items, get, "", 2).map(get)).toEqual([
      "customers",
      "orders",
    ]);
  });

  it("filters non-matches and sorts by score, stable on ties", () => {
    // both "orders" and "order_items" are prefix matches (score 1) -> original order
    expect(fuzzyRank(items, get, "order").map(get)).toEqual([
      "orders",
      "order_items",
    ]);
  });

  it("returns nothing when no item matches", () => {
    expect(fuzzyRank(items, get, "zzz")).toEqual([]);
  });

  it("caps ranked results at the limit", () => {
    expect(fuzzyRank(items, get, "s", 1)).toHaveLength(1);
  });
});

/**
 * @jest-environment jsdom
 */
import {
  deleteView,
  listViews,
  newViewId,
  SavedView,
  upsertView,
} from "./saved-views";

const scope = "/vault/abc:public.orders";

beforeEach(() => window.localStorage.clear());

const make = (over: Partial<SavedView> = {}): SavedView => ({
  id: newViewId(),
  name: "Open orders",
  where: "status = 'open'",
  sortColumns: [{ columnName: "created_at", by: "DESC" }],
  columns: ["id", "status", "created_at"],
  ...over,
});

describe("saved-views", () => {
  it("starts empty and round-trips a saved view", () => {
    expect(listViews(scope)).toEqual([]);
    const v = make();
    upsertView(scope, v);
    const got = listViews(scope);
    expect(got).toHaveLength(1);
    expect(got[0]).toEqual(v);
  });

  it("replaces a view with the same id instead of duplicating", () => {
    const v = make();
    upsertView(scope, v);
    upsertView(scope, { ...v, name: "Renamed", where: "status = 'closed'" });
    const got = listViews(scope);
    expect(got).toHaveLength(1);
    expect(got[0].name).toBe("Renamed");
    expect(got[0].where).toBe("status = 'closed'");
  });

  it("keeps views isolated per scope (connection+table)", () => {
    upsertView(scope, make({ name: "A" }));
    upsertView("/vault/abc:public.customers", make({ name: "B" }));
    expect(listViews(scope).map((v) => v.name)).toEqual(["A"]);
    expect(listViews("/vault/abc:public.customers").map((v) => v.name)).toEqual([
      "B",
    ]);
  });

  it("deletes by id", () => {
    const a = make({ name: "A" });
    const b = make({ name: "B" });
    upsertView(scope, a);
    upsertView(scope, b);
    deleteView(scope, a.id);
    expect(listViews(scope).map((v) => v.name)).toEqual(["B"]);
  });

  it("tolerates corrupt storage", () => {
    window.localStorage.setItem(`pmsql.savedViews:${scope}`, "{not json");
    expect(listViews(scope)).toEqual([]);
  });
});

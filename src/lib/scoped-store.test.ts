/**
 * @jest-environment jsdom
 */
import { scopedStore } from "./scoped-store";

describe("scopedStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns the fallback when unset", () => {
    expect(scopedStore("missing", []).read()).toEqual([]);
    expect(scopedStore("missing-obj", { a: 1 }).read()).toEqual({ a: 1 });
  });

  it("round-trips a typed value under the pmsql. namespace", () => {
    const store = scopedStore<{ n: number }[]>("things", []);
    store.write([{ n: 1 }, { n: 2 }]);
    expect(store.read()).toEqual([{ n: 1 }, { n: 2 }]);
    // stored under the namespaced key
    expect(window.localStorage.getItem("pmsql.things")).toBe('[{"n":1},{"n":2}]');
  });

  it("update reads-modifies-writes", () => {
    const store = scopedStore<number>("count", 0);
    store.write(5);
    store.update((n) => n + 1);
    expect(store.read()).toBe(6);
  });

  it("clear removes the key (read falls back)", () => {
    const store = scopedStore<string>("tmp", "def");
    store.write("x");
    store.clear();
    expect(store.read()).toBe("def");
    expect(window.localStorage.getItem("pmsql.tmp")).toBeNull();
  });

  it("returns the fallback (not throw) on malformed stored JSON", () => {
    window.localStorage.setItem("pmsql.broken", "{not json");
    expect(scopedStore("broken", { ok: true }).read()).toEqual({ ok: true });
  });

  it("isolates values by name", () => {
    scopedStore<number>("a", 0).write(1);
    scopedStore<number>("b", 0).write(2);
    expect(scopedStore<number>("a", 0).read()).toBe(1);
    expect(scopedStore<number>("b", 0).read()).toBe(2);
  });
});

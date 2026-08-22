/** @jest-environment node */
import type { TabRestoreDescriptor } from "@/components/gui/windows-tab";
import {
  nextQueryCounter,
  parseQueryIndex,
  queryRestoreArgs,
  serializeQueryTabs,
  stripTypePrefix,
} from "./tab-restore";

const desc = (over: Partial<TabRestoreDescriptor>): TabRestoreDescriptor => ({
  type: "query",
  key: "query-abc",
  title: "Query 2",
  options: undefined,
  ...over,
});

// A minimal tab shape — serialize only reads type + restore.
const tab = (over: Record<string, unknown>) =>
  ({
    component: null,
    icon: null,
    identifier: "x",
    key: "x",
    title: "x",
    ...over,
  }) as never;

describe("serializeQueryTabs", () => {
  test("keeps query tabs that carry a restore snapshot, in order", () => {
    const a = desc({ key: "query-a", title: "Query" });
    const b = desc({ key: "query-b", title: "Query 2" });
    const tabs = [
      tab({ type: "query", restore: a }),
      tab({ type: "table", restore: desc({ type: "table", key: "table-t" }) }),
      tab({ type: "query", restore: b }),
      tab({ type: "query" }), // no restore snapshot → skipped
    ];
    expect(serializeQueryTabs(tabs)).toEqual([a, b]);
  });
});

describe("stripTypePrefix", () => {
  test("removes the leading type prefix, once", () => {
    expect(stripTypePrefix("query-abc", "query")).toBe("abc");
    expect(stripTypePrefix("query-query-x", "query")).toBe("query-x");
    expect(stripTypePrefix("plain", "query")).toBe("plain");
  });
});

describe("queryRestoreArgs", () => {
  test("unsaved query restores by id + title", () => {
    expect(queryRestoreArgs(desc({ key: "query-xyz", title: "Query 4" }))).toEqual(
      { restoreId: "xyz", name: "Query 4" }
    );
  });

  test("saved query restores through its saved payload", () => {
    const saved = { key: "doc1", sql: "select 1", namespaceName: "ns" };
    expect(
      queryRestoreArgs(desc({ key: "query-doc1", title: "Report", options: { saved } }))
    ).toEqual({ saved, name: "Report" });
  });
});

describe("parseQueryIndex / nextQueryCounter", () => {
  test("parses only auto-numbered titles", () => {
    expect(parseQueryIndex("Query 7")).toBe(7);
    expect(parseQueryIndex("Query")).toBeNull();
    expect(parseQueryIndex("My Report")).toBeNull();
  });

  test("next counter clears the highest restored number", () => {
    expect(
      nextQueryCounter([
        desc({ title: "Query" }),
        desc({ title: "Query 3" }),
        desc({ title: "Query 5" }),
        desc({ title: "Named" }),
      ])
    ).toBe(6);
  });

  test("defaults to 2 when nothing is numbered", () => {
    expect(nextQueryCounter([desc({ title: "Query" })])).toBe(2);
  });
});

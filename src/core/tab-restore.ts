/**
 * Pure helpers for restoring the open-tab set across a reload. Kept free of
 * React/JSX so it can be unit-tested in the node env. The impure part —
 * turning a descriptor back into a live tab via the query opener — lives in
 * `database-gui`, which already runs in a React context.
 *
 * Scope: query tabs only. They are self-contained (just SQL, keyed per
 * connection) and safe to rebuild before a connection is live. Table/schema/
 * ERD tabs depend on a loaded schema at reload time, so they are not restored.
 */
import type { TabRestoreDescriptor, WindowTabItemProps } from "@/components/gui/windows-tab";

/** Options accepted by `builtinOpenQueryTab.open`/`.generate` for a query tab. */
export interface QueryRestoreArgs {
  name?: string;
  restoreId?: string;
  saved?: { namespaceName?: string; key: string; sql: string };
}

/** The query tabs (with a restore snapshot) from the current tab set, in order. */
export function serializeQueryTabs(
  tabs: WindowTabItemProps[]
): TabRestoreDescriptor[] {
  return tabs
    .filter((t) => t.type === "query" && t.restore)
    .map((t) => t.restore as TabRestoreDescriptor);
}

/** Drop the leading `"<type>-"` from a composed tab key (`query-abc` → `abc`). */
export function stripTypePrefix(key: string, type: string): string {
  const prefix = `${type}-`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/**
 * The opener args that recreate a query tab from its descriptor — reusing its
 * id and name so the rebuilt tab reconnects its SQL draft. A saved query
 * restores through its saved payload; an unsaved one through its id + title.
 */
export function queryRestoreArgs(d: TabRestoreDescriptor): QueryRestoreArgs {
  const opts =
    d.options && typeof d.options === "object"
      ? (d.options as { saved?: QueryRestoreArgs["saved"] })
      : undefined;
  if (opts?.saved) {
    return { saved: opts.saved, name: d.title };
  }
  return { restoreId: stripTypePrefix(d.key, d.type), name: d.title };
}

/** Parse the N from an auto-numbered `"Query N"` title (else null). */
export function parseQueryIndex(title: string): number | null {
  const m = /^Query (\d+)$/.exec(title);
  return m ? Number(m[1]) : null;
}

/**
 * The next auto-number a fresh unsaved query should take so it clears every
 * restored `"Query N"`. Restored tabs keep their own names; this only moves
 * the counter for tabs opened *after* a restore.
 */
export function nextQueryCounter(descriptors: TabRestoreDescriptor[]): number {
  let max = 1;
  for (const d of descriptors) {
    const n = parseQueryIndex(d.title);
    if (n !== null && n > max) max = n;
  }
  return max + 1;
}

// Per-connection SQL query history with zoxide-style frecency ranking
// (frequently + recently run queries surface first). Persisted via scopedStore.

import { frecencyScore } from "./frecency";
import { scopedStore } from "./scoped-store";

export interface QueryHistoryEntry {
  sql: string;
  at: number;
  count: number;
}

const MAX = 200;

const store = (scope: string) =>
  scopedStore<QueryHistoryEntry[]>(`history:${scope}`, []);

function read(scope: string): QueryHistoryEntry[] {
  // Back-compat with entries saved before `count` existed.
  return store(scope)
    .read()
    .map((e) => ({ ...e, count: e.count ?? 1 }));
}

// Frecency ranking shared with the table-usage sort (src/lib/frecency.ts), so
// the two rankers stay in lockstep.
function frecency(e: QueryHistoryEntry, now: number): number {
  return frecencyScore(e.count, e.at, now);
}

/** History for a connection, ranked most-run-and-recent first. */
export function getHistory(scope: string): QueryHistoryEntry[] {
  const now = Date.now();
  return read(scope).sort((a, b) => frecency(b, now) - frecency(a, now));
}

export function addHistory(scope: string, sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) return;
  const list = read(scope);
  const existing = list.find((e) => e.sql === trimmed);
  if (existing) {
    existing.count += 1;
    existing.at = Date.now();
  } else {
    list.push({ sql: trimmed, at: Date.now(), count: 1 });
  }
  // Cap by keeping the highest-frecency entries.
  const now = Date.now();
  store(scope).write(
    list.sort((a, b) => frecency(b, now) - frecency(a, now)).slice(0, MAX)
  );
}

/** Remove a single query from history by its exact SQL. */
export function deleteHistory(scope: string, sql: string): void {
  store(scope).update((list) => list.filter((e) => e.sql !== sql));
}

export function clearHistory(scope: string): void {
  store(scope).clear();
}

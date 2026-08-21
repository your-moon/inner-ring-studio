// Per-connection SQL query history with zoxide-style frecency ranking
// (frequently + recently run queries surface first). Stored in localStorage.

import { frecencyScore } from "./frecency";

export interface QueryHistoryEntry {
  sql: string;
  at: number;
  count: number;
}

const MAX = 200;

function key(scope: string): string {
  return `pmsql.history:${scope}`;
}

function read(scope: string): QueryHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(scope));
    if (!raw) return [];
    const list = JSON.parse(raw) as QueryHistoryEntry[];
    // Back-compat with entries saved before `count` existed.
    return list.map((e) => ({ ...e, count: e.count ?? 1 }));
  } catch {
    return [];
  }
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
  if (typeof window === "undefined") return;
  const trimmed = sql.trim();
  if (!trimmed) return;
  try {
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
    const capped = list
      .sort((a, b) => frecency(b, now) - frecency(a, now))
      .slice(0, MAX);
    window.localStorage.setItem(key(scope), JSON.stringify(capped));
  } catch {
    /* ignore quota errors */
  }
}

/** Remove a single query from history by its exact SQL. */
export function deleteHistory(scope: string, sql: string): void {
  if (typeof window === "undefined") return;
  try {
    const kept = read(scope).filter((e) => e.sql !== sql);
    window.localStorage.setItem(key(scope), JSON.stringify(kept));
  } catch {
    /* ignore */
  }
}

export function clearHistory(scope: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(scope));
  } catch {
    /* ignore */
  }
}

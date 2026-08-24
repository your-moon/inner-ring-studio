// Zoxide-style frecency for tables: rank by how OFTEN and how RECENTLY a table
// was opened, so the tables you actually work in float to the top. Persisted
// per connection via scopedStore (client-only).

import { frecencyScore } from "./frecency";
import { scopedStore } from "./scoped-store";

interface Entry {
  count: number;
  last: number;
}
type Store = Record<string, Entry>;

const store = (connKey: string) =>
  scopedStore<Store>(`frecency:${connKey}`, {});

/** Record that a table was opened. */
export function bumpTable(connKey: string, table: string) {
  store(connKey).update((s) => {
    const e = s[table] ?? { count: 0, last: 0 };
    return { ...s, [table]: { count: e.count + 1, last: Date.now() } };
  });
}

/** Frecency score per table name (higher = more used). Unseen tables are absent.
 *  Ranking shared with the query-history sort (src/lib/frecency.ts). */
export function frecencyScores(connKey: string): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const [t, e] of Object.entries(store(connKey).read())) {
    out[t] = frecencyScore(e.count, e.last, now);
  }
  return out;
}

export interface TableFrecencyEntry extends Entry {
  table: string;
  score: number;
}

/**
 * Full table-usage records for resume surfaces. The sidebar only needs scores,
 * while home also needs the last-opened timestamp to interleave tables with
 * recent queries honestly.
 */
export function tableFrecencyEntries(connKey: string): TableFrecencyEntry[] {
  const now = Date.now();
  return Object.entries(store(connKey).read()).map(([table, entry]) => ({
    table,
    ...entry,
    score: frecencyScore(entry.count, entry.last, now),
  }));
}

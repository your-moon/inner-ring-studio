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

// Zoxide-style frecency for tables: rank by how OFTEN and how RECENTLY a table
// was opened, so the tables you actually work in float to the top. Kept per
// connection in localStorage (client-only).

interface Entry {
  count: number;
  last: number;
}
type Store = Record<string, Entry>;

const keyFor = (connKey: string) => `pmsql.frecency:${connKey}`;

function read(connKey: string): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(keyFor(connKey)) || "{}");
  } catch {
    return {};
  }
}

function write(connKey: string, store: Store) {
  try {
    window.localStorage.setItem(keyFor(connKey), JSON.stringify(store));
  } catch {
    // ignore quota / disabled storage
  }
}

/** Record that a table was opened. */
export function bumpTable(connKey: string, table: string) {
  const store = read(connKey);
  const e = store[table] ?? { count: 0, last: 0 };
  store[table] = { count: e.count + 1, last: Date.now() };
  write(connKey, store);
}

// zoxide's recency weighting: recent accesses count for much more than old ones.
function ageFactor(ageMs: number): number {
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const WEEK = 604_800_000;
  if (ageMs < HOUR) return 4;
  if (ageMs < DAY) return 2;
  if (ageMs < WEEK) return 0.5;
  return 0.25;
}

/** Frecency score per table name (higher = more used). Unseen tables are absent. */
export function frecencyScores(connKey: string): Record<string, number> {
  const store = read(connKey);
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const [t, e] of Object.entries(store)) {
    out[t] = e.count * ageFactor(now - e.last);
  }
  return out;
}

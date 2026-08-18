// Per-connection SQL query history, stored in localStorage (this device).

export interface QueryHistoryEntry {
  sql: string;
  at: number;
}

const MAX = 100;

function key(scope: string): string {
  return `pmsql.history:${scope}`;
}

export function getHistory(scope: string): QueryHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(scope));
    return raw ? (JSON.parse(raw) as QueryHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addHistory(scope: string, sql: string): void {
  if (typeof window === "undefined") return;
  const trimmed = sql.trim();
  if (!trimmed) return;
  try {
    const list = getHistory(scope).filter((e) => e.sql !== trimmed);
    list.unshift({ sql: trimmed, at: Date.now() });
    window.localStorage.setItem(key(scope), JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore quota errors */
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

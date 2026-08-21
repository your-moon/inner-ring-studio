// The shape of a query result as the server sends it to the client, plus the
// one place the three dialect adapters (postgres / mysql / clickhouse) turn raw
// driver output into it. The header de-duplication + object-row assembly + stat
// used to be copy-pasted in all three; here it lives once. Each dialect supplies
// only what varies: its column type-map, and whether cells need normalizing.

export interface ColumnHeader {
  name: string;
  displayName: string;
  originalType: string | null;
  // ColumnType hint: TEXT=1, INTEGER=2, REAL=3, BLOB=4.
  type: number;
}

export interface DatabaseResultSet {
  rows: Record<string, unknown>[];
  headers: ColumnHeader[];
  stat: {
    rowsAffected: number;
    rowsRead: number | null;
    rowsWritten: number | null;
    queryDurationMs: number | null;
  };
  lastInsertRowid?: number;
}

/** One column before header de-duplication: raw name + the dialect's type info. */
export interface ColumnMeta {
  name: string;
  originalType: string | null;
  type: number;
}

// Cell coercion shared by Postgres and MySQL: keep Buffers as-is (rendered as
// binary), and turn arrays/objects (pg arrays, json/jsonb parsed to objects,
// mysql2 JSON columns) into readable JSON text. ClickHouse does not use this —
// its JSONCompact values are already grid-ready primitives/strings.
export function normalizeCellJson(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Buffer.isBuffer(v)) return v;
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  return v;
}

/**
 * Assemble a DatabaseResultSet from a dialect's columns + array-mode rows:
 * de-duplicate repeated column names (rename to `__name_i`, matching the rqlite
 * transport), build object-rows keyed by the deduped header name (each cell run
 * through `normalizeCell` when given), and attach stats. `rowsAffected` defaults
 * to the row count; pass it for write results (INSERT/UPDATE/DDL).
 */
export function assembleResultSet(
  columns: ColumnMeta[],
  dataRows: unknown[][],
  opts: { normalizeCell?: (v: unknown) => unknown; rowsAffected?: number } = {}
): DatabaseResultSet {
  const seen = new Set<string>();
  const headers: ColumnHeader[] = columns.map((c) => {
    let name = c.name;
    let i = 0;
    while (seen.has(name)) name = `__${c.name}_${i++}`;
    seen.add(name);
    return {
      name,
      displayName: c.name,
      originalType: c.originalType,
      type: c.type,
    };
  });
  const norm = opts.normalizeCell;
  const rows = dataRows.map((arr) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = norm ? norm(arr[i]) : arr[i];
      return o;
    }, {})
  );
  return {
    rows,
    headers,
    stat: {
      rowsAffected: opts.rowsAffected ?? rows.length,
      rowsRead: null,
      rowsWritten: null,
      queryDurationMs: null,
    },
  };
}

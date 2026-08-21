import { types } from "pg";
import Cursor from "pg-cursor";
import { getPool } from "@/lib/pg-pool";
import {
  closeCursor as closeHeldCursor,
  openCursor,
  readMore,
  type CursorField,
} from "@/lib/query-cursor";
import {
  assembleResultSet,
  normalizeCellJson,
  type ColumnMeta,
  type DatabaseResultSet,
} from "@/lib/result-set";
import { wrapForTopN } from "@/lib/sql-topn";
import type {
  FetchMoreResult,
  PaginateResult,
  QueryExecutor,
  SingleResult,
} from "./index";

// Return date/time values as the raw Postgres text (formatted in the session
// timezone) instead of parsing to a JS Date — a Date serializes to a UTC ISO
// string, which is why timestamps rendered "always UTC". With the string kept
// as-is, the value reflects the connection's timezone (see getPool).
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1083, (v) => v); // time
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(1266, (v) => v); // timetz
// Keep json/jsonb as their raw text so the grid renders readable JSON instead
// of "[object Object]" (node-postgres parses these to objects by default).
types.setTypeParser(114, (v) => v); // json
types.setTypeParser(3802, (v) => v); // jsonb

// pg data type OID -> [type name, ColumnType hint]. TEXT=1, INTEGER=2, REAL=3,
// BLOB=4. This dialect-specific type-map is the only shaping input pg supplies;
// header dedup + row assembly live in @/lib/result-set.
const OID: Record<number, [string, number]> = {
  16: ["bool", 1],
  17: ["bytea", 4],
  20: ["int8", 2],
  21: ["int2", 2],
  23: ["int4", 2],
  26: ["oid", 2],
  700: ["float4", 3],
  701: ["float8", 3],
  1700: ["numeric", 3],
  25: ["text", 1],
  1042: ["bpchar", 1],
  1043: ["varchar", 1],
  2950: ["uuid", 1],
  114: ["json", 1],
  3802: ["jsonb", 1],
  1082: ["date", 1],
  1114: ["timestamp", 1],
  1184: ["timestamptz", 1],
  1083: ["time", 1],
};

function pgColumns(
  fields: { name: string; dataTypeID: number }[]
): ColumnMeta[] {
  return fields.map((f) => {
    const [originalType, type] = OID[f.dataTypeID] ?? ["unknown", 1];
    return { name: f.name, originalType, type };
  });
}

// rowMode:"array" everywhere so duplicate column names survive to be deduped.
function pgResultSet(
  fields: { name: string; dataTypeID: number }[],
  rows: unknown[][],
  rowsAffected?: number
): DatabaseResultSet {
  return assembleResultSet(pgColumns(fields), rows, {
    normalizeCell: normalizeCellJson,
    rowsAffected,
  });
}

// Single-statement form. Use a server-side cursor to fetch only the first N
// rows (like DBeaver's fetch size) instead of buffering the entire result set —
// this is what makes `SELECT * FROM big_table` return instantly.
async function pgSingle(
  cfg: Parameters<typeof getPool>[0],
  sql: string
): Promise<SingleResult> {
  const maxRows = Math.max(1, Number(process.env.PMSQL_MAX_ROWS) || 1000);
  const client = await getPool(cfg).connect();
  try {
    const cursor = client.query(
      new Cursor(wrapForTopN(sql, maxRows), [], { rowMode: "array" })
    ) as unknown as {
      read(n: number): Promise<unknown[][]>;
      close(): Promise<void>;
      _result?: { fields?: { name: string; dataTypeID: number }[] };
    };
    const rows = await cursor.read(maxRows);
    const fields = cursor._result?.fields ?? [];
    await cursor.close();
    return {
      result: pgResultSet(fields, rows),
      truncated: rows.length >= maxRows,
    };
  } finally {
    client.release();
  }
}

export const postgresExecutor: QueryExecutor = {
  // Explicit close (e.g. the result tab was closed) — free the held cursor.
  async closeCursor(_cfg, cursorId) {
    await closeHeldCursor(cursorId);
  },

  // Lazy-pagination "load more": read the next page from a held cursor.
  async fetchMore(_cfg, cursorId, pageSize): Promise<FetchMoreResult> {
    const page = await readMore(cursorId, pageSize);
    if (!page) {
      // Cursor expired (idle-swept or evicted) — client should re-run.
      return { expired: true, rows: [], hasMore: false };
    }
    return {
      rows: pgResultSet(page.fields as CursorField[], page.rows).rows,
      hasMore: page.hasMore,
    };
  },

  // Transaction form: run statements in order inside one transaction.
  async statements(cfg, statements) {
    const client = await getPool(cfg).connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const stmt of statements) {
        const r = await client.query({ text: stmt, rowMode: "array" });
        results.push(
          pgResultSet(
            (r.fields ?? []) as { name: string; dataTypeID: number }[],
            (r.rows ?? []) as unknown[][],
            r.rowCount ?? 0
          )
        );
      }
      await client.query("COMMIT");
      return { results };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  },

  async paginate(cfg, sql, pageSize): Promise<PaginateResult> {
    // Lazy pagination: open a held cursor and return the first page + its id.
    // Only for read queries (SELECT / WITH) — never hold a cursor over a write.
    if (/^\s*(select|with)\b/i.test(sql)) {
      const page = await openCursor(getPool(cfg), sql, pageSize);
      return {
        result: pgResultSet(page.fields as CursorField[], page.rows),
        cursorId: page.cursorId,
        hasMore: page.hasMore,
      };
    }
    // Not a read query: the original route fell through to the single top-N
    // path (which caps and returns the result with no cursor).
    const s = await pgSingle(cfg, sql);
    return { result: s.result, cursorId: null, hasMore: false };
  },

  single: pgSingle,
};

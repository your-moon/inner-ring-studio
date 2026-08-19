import { NextResponse } from "next/server";
import { types, type QueryArrayResult } from "pg";
import Cursor from "pg-cursor";
import { getConnection } from "@/lib/vault";
import { requireAuth } from "@/lib/auth";
import { getPool, type PgConnConfig } from "@/lib/pg-pool";
import { clickhouseQuery } from "@/lib/clickhouse";
import { wrapForTopN } from "@/lib/sql-topn";
import {
  clampPageSize,
  closeCursor,
  openCursor,
  readMore,
  type CursorField,
} from "@/lib/query-cursor";

// node-postgres needs the Node.js runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Return date/time values as the raw Postgres text (formatted in the session
// timezone) instead of parsing to a JS Date — a Date serializes to a UTC ISO
// string, which is why timestamps rendered "always UTC". With the string kept
// as-is, the value reflects the connection's timezone (see getPool below).
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1083, (v) => v); // time
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(1266, (v) => v); // timetz
// Keep json/jsonb as their raw text so the grid renders readable JSON instead
// of "[object Object]" (node-postgres parses these to objects by default).
types.setTypeParser(114, (v) => v); // json
types.setTypeParser(3802, (v) => v); // jsonb

/**
 * Resolve the effective connection config for a request. Preferred path: the
 * browser sends only a `connectionId`, and we look the record up in the
 * server-side vault so the password never leaves the server. Fallback: an
 * inline `connection` object (used by the manual "new connection" form before a
 * vault entry exists).
 */
function resolveConnection(body: {
  connectionId?: string;
  connection?: PgConnConfig;
}): PgConnConfig {
  if (body.connectionId) {
    const c = getConnection(body.connectionId);
    if (!c) throw new Error(`Unknown connection id: ${body.connectionId}`);
    return {
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password: c.password,
      ssl: c.ssl,
      timezone: c.timezone,
      readOnly: c.readOnly,
      driver: c.driver,
    };
  }
  if (body.connection?.host && body.connection?.port) return body.connection;
  throw new Error("Missing connectionId or connection host/port");
}

// Always refuse the cloud-metadata address. Broader private-range blocking is
// gated behind the vault milestone (dev connects to localhost/Docker).
function assertConnectable(host: string): void {
  if (host === "169.254.169.254") {
    throw new Error("Refusing to connect to link-local metadata address");
  }
}

// ---------------------------------------------------------------------------
// pg result -> DatabaseResultSet. rowMode:"array" so duplicate column
// names survive (deduped like the rqlite transport does).
// ColumnType hint values: TEXT=1, INTEGER=2, REAL=3, BLOB=4.
// ---------------------------------------------------------------------------
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

function toHeaders(fields: { name: string; dataTypeID: number }[]) {
  const seen = new Set<string>();
  return fields.map((f) => {
    let name = f.name;
    let i = 0;
    while (seen.has(name)) name = `__${f.name}_${i++}`;
    seen.add(name);
    const [originalType, type] = OID[f.dataTypeID] ?? ["unknown", 1];
    return { name, displayName: f.name, originalType, type };
  });
}

// Postgres arrays (e.g. text[]) come back as JS arrays and composite/range types
// as objects — the grid can't render those, so show them as JSON text. Bytea
// stays a Buffer so it renders as binary.
function normalizeCell(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Buffer.isBuffer(v)) return v;
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  return v;
}

// Build object-rows (keyed by header name, cells normalized) exactly like
// toResultSet, for the fetch-more path that returns rows without re-sending
// headers.
function objectifyRows(fields: CursorField[], rows: unknown[][]) {
  const headers = toHeaders(fields);
  return rows.map((arr) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = normalizeCell(arr[i]);
      return o;
    }, {})
  );
}

function toResultSet(r: QueryArrayResult) {
  const headers = toHeaders(
    (r.fields ?? []) as { name: string; dataTypeID: number }[]
  );
  const rows = (r.rows ?? []).map((arr: unknown[]) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = normalizeCell(arr[i]);
      return o;
    }, {})
  );
  return {
    rows,
    headers,
    stat: {
      rowsAffected: r.rowCount ?? 0,
      rowsRead: null,
      rowsWritten: null,
      queryDurationMs: null,
    },
    lastInsertRowid: undefined,
  };
}

// ClickHouse is stateless HTTP (no server-side cursor), so its lazy pagination
// uses LIMIT/OFFSET with the offset carried in an opaque cursor token. Correct
// for a query with a stable ORDER BY; for an unordered browse the order may
// shift between pages — acceptable for read-only OLAP browsing, and far better
// than loading the whole table. Returns the (trimmed) SQL if it can be paged,
// or null for statements we must run verbatim (SHOW/DESCRIBE, explicit
// LIMIT/OFFSET, or a FORMAT clause).
function chPageable(sql: string): string | null {
  const t = sql.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(t)) return null;
  if (/\b(limit|offset)\b/i.test(t)) return null;
  if (/\bformat\b/i.test(t)) return null;
  return t;
}
function encodeChCursor(sql: string, offset: number): string {
  return Buffer.from(JSON.stringify({ sql, offset })).toString("base64url");
}
function decodeChCursor(token: string): { sql: string; offset: number } | null {
  try {
    const o = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (typeof o.sql === "string" && typeof o.offset === "number") return o;
  } catch {
    /* malformed token */
  }
  return null;
}

export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    const conn = resolveConnection(body);
    assertConnectable(conn.host);

    // ClickHouse uses its HTTP client instead of the pg pool. It has no
    // transactions; run statements sequentially.
    if (conn.driver === "clickhouse") {
      // Stateless — no held cursor to release.
      if (typeof body.closeCursorId === "string") {
        return NextResponse.json({ ok: true });
      }
      // Load more: decode the offset from the cursor token and read the next page.
      if (typeof body.cursorId === "string" && body.fetchMore != null) {
        const dec = decodeChCursor(body.cursorId);
        if (!dec) {
          return NextResponse.json({ expired: true, rows: [], hasMore: false });
        }
        const pageSize = clampPageSize(body.fetchMore);
        const rs = await clickhouseQuery(conn, dec.sql, {
          limit: pageSize,
          offset: dec.offset,
        });
        const hasMore = rs.rows.length >= pageSize;
        return NextResponse.json({
          rows: rs.rows,
          hasMore,
          nextCursorId: hasMore
            ? encodeChCursor(dec.sql, dec.offset + pageSize)
            : null,
        });
      }

      if (Array.isArray(body.statements)) {
        const results = [];
        for (const stmt of body.statements as string[]) {
          results.push(await clickhouseQuery(conn, stmt));
        }
        return NextResponse.json({ results });
      }
      if (typeof body.sql !== "string") {
        return NextResponse.json({ error: "Missing sql" }, { status: 400 });
      }

      // First page (instant load): cap a plain read with LIMIT and hand back an
      // offset cursor so the grid can lazily load more as the user scrolls.
      if (body.paginate != null) {
        const pageable = chPageable(body.sql);
        const pageSize = clampPageSize(body.paginate);
        if (pageable) {
          const rs = await clickhouseQuery(conn, pageable, {
            limit: pageSize,
            offset: 0,
          });
          const hasMore = rs.rows.length >= pageSize;
          return NextResponse.json({
            result: rs,
            cursorId: hasMore ? encodeChCursor(pageable, pageSize) : null,
            hasMore,
          });
        }
        // Not pageable (SHOW/DESCRIBE, explicit LIMIT, FORMAT) — run verbatim.
        return NextResponse.json({
          result: await clickhouseQuery(conn, body.sql),
          cursorId: null,
          hasMore: false,
        });
      }

      return NextResponse.json({ result: await clickhouseQuery(conn, body.sql) });
    }

    const pool = getPool(conn);

    // Lazy-pagination "load more": read the next page from a held cursor.
    if (typeof body.cursorId === "string" && body.fetchMore != null) {
      const page = await readMore(body.cursorId, clampPageSize(body.fetchMore));
      if (!page) {
        // Cursor expired (idle-swept or evicted) — client should re-run.
        return NextResponse.json({ expired: true, rows: [], hasMore: false });
      }
      return NextResponse.json({
        rows: objectifyRows(page.fields, page.rows),
        hasMore: page.hasMore,
      });
    }

    // Explicit close (e.g. the result tab was closed) — free the connection.
    if (typeof body.closeCursorId === "string") {
      await closeCursor(body.closeCursorId);
      return NextResponse.json({ ok: true });
    }

    // Transaction form: run statements in order inside one transaction.
    if (Array.isArray(body.statements)) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const stmt of body.statements as string[]) {
          results.push(
            toResultSet(await client.query({ text: stmt, rowMode: "array" }))
          );
        }
        await client.query("COMMIT");
        return NextResponse.json({ results });
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    }

    // Single-statement form. Use a server-side cursor to fetch only the first
    // N rows (like DBeaver's fetch size) instead of buffering the entire result
    // set — this is what makes `SELECT * FROM big_table` return instantly.
    if (typeof body.sql !== "string") {
      return NextResponse.json({ error: "Missing sql" }, { status: 400 });
    }

    // Lazy pagination: open a held cursor and return the first page + its id.
    // Only for read queries (SELECT / WITH) — never hold a cursor over a write.
    if (body.paginate != null && /^\s*(select|with)\b/i.test(body.sql)) {
      const page = await openCursor(pool, body.sql, clampPageSize(body.paginate));
      return NextResponse.json({
        result: toResultSet({
          fields: page.fields,
          rows: page.rows,
          rowCount: page.rows.length,
        } as unknown as QueryArrayResult),
        cursorId: page.cursorId,
        hasMore: page.hasMore,
      });
    }

    const maxRows = Math.max(1, Number(process.env.PMSQL_MAX_ROWS) || 1000);
    const client = await pool.connect();
    try {
      const cursor = client.query(
        new Cursor(wrapForTopN(body.sql, maxRows), [], { rowMode: "array" })
      ) as unknown as {
        read(n: number): Promise<unknown[][]>;
        close(): Promise<void>;
        _result?: { fields?: { name: string; dataTypeID: number }[] };
      };
      const rows = await cursor.read(maxRows);
      const fields = cursor._result?.fields ?? [];
      await cursor.close();
      return NextResponse.json({
        result: toResultSet({
          fields,
          rows,
          rowCount: rows.length,
        } as unknown as QueryArrayResult),
        truncated: rows.length >= maxRows,
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

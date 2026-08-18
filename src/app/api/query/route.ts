import { NextResponse } from "next/server";
import { types, type QueryArrayResult } from "pg";
import Cursor from "pg-cursor";
import { getConnection } from "@/lib/vault";
import { requireAuth } from "@/lib/auth";
import { getPool, type PgConnConfig } from "@/lib/pg-pool";
import { clickhouseQuery } from "@/lib/clickhouse";

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

// Wrap a plain editor SELECT with an outer LIMIT so Postgres uses a bounded
// top-N sort (fast) instead of sorting the whole table, when the user didn't
// specify a LIMIT. Conservative: only single, lock-free SELECTs are wrapped.
function wrapForTopN(sql: string, maxRows: number): string {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(trimmed)) return sql;
  if (/;/.test(trimmed)) return sql; // multiple statements
  if (/\b(limit|offset)\b/i.test(trimmed)) return sql;
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i.test(trimmed))
    return sql;
  if (/\binto\b/i.test(trimmed)) return sql; // SELECT INTO
  // Append (not wrap) so Postgres can use an index for ORDER BY … LIMIT and
  // return instantly instead of sorting the whole table.
  return `${trimmed} LIMIT ${maxRows}`;
}

// Always refuse the cloud-metadata address. Broader private-range blocking is
// gated behind the vault milestone (dev connects to localhost/Docker).
function assertConnectable(host: string): void {
  if (host === "169.254.169.254") {
    throw new Error("Refusing to connect to link-local metadata address");
  }
}

// ---------------------------------------------------------------------------
// pg result -> Outerbase DatabaseResultSet. rowMode:"array" so duplicate column
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
      return NextResponse.json({ result: await clickhouseQuery(conn, body.sql) });
    }

    const pool = getPool(conn);

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
    const maxRows = Math.max(1, Number(process.env.PMSQL_MAX_ROWS) || 5000);
    const client = await pool.connect();
    try {
      const cursor = client.query(
        new Cursor(wrapForTopN(body.sql, maxRows), [], { rowMode: "array" })
      );
      const rows = (await cursor.read(maxRows)) as unknown[][];
      const fields =
        (
          cursor as unknown as {
            _result?: { fields?: { name: string; dataTypeID: number }[] };
          }
        )._result?.fields ?? [];
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

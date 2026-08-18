import { NextResponse } from "next/server";
import { Pool, types, type QueryArrayResult } from "pg";
import { getConnection } from "@/lib/vault";
import { requireAuth } from "@/lib/auth";

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

interface ConnConfig {
  host: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  timezone?: string;
}

/**
 * Resolve the effective connection config for a request. Preferred path: the
 * browser sends only a `connectionId`, and we look the record up in the
 * server-side vault so the password never leaves the server. Fallback: an
 * inline `connection` object (used by the manual "new connection" form before a
 * vault entry exists).
 */
function resolveConnection(body: {
  connectionId?: string;
  connection?: ConnConfig;
}): ConnConfig {
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
    };
  }
  if (body.connection?.host && body.connection?.port) return body.connection;
  throw new Error("Missing connectionId or connection host/port");
}

// ---------------------------------------------------------------------------
// Keyed pool registry — one live pool per (host,port,db,user). Survives across
// requests in a running server. The key deliberately scopes by user so two
// different credentials never share a pool.
// (Milestone 5 will move credentials into a server-side encrypted vault and key
//  pools by connection id instead of raw config.)
// ---------------------------------------------------------------------------
const pools = new Map<string, Pool>();

function poolKey(c: ConnConfig): string {
  return `${c.host}:${c.port}:${c.database ?? ""}:${c.user ?? ""}:${c.ssl ? 1 : 0}`;
}

function getPool(c: ConnConfig): Pool {
  const key = poolKey(c);
  let pool = pools.get(key);
  if (!pool) {
    pool = new Pool({
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password: c.password,
      ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", () => {
      // Swallow idle-client errors so one dead socket doesn't crash the server.
    });
    // Apply the connection timezone (or the server default PMSQL_TZ) to every
    // client so timestamps render in local time rather than UTC.
    const tz = c.timezone ?? process.env.PMSQL_TZ;
    if (tz) {
      pool.on("connect", (client) => {
        client.query(`SET TIME ZONE '${tz.replace(/'/g, "")}'`).catch(() => {});
      });
    }
    pools.set(key, pool);
  }
  return pool;
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

function toResultSet(r: QueryArrayResult) {
  const headers = toHeaders(
    (r.fields ?? []) as { name: string; dataTypeID: number }[]
  );
  const rows = (r.rows ?? []).map((arr: unknown[]) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = arr[i];
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

    // Single-statement form.
    if (typeof body.sql !== "string") {
      return NextResponse.json({ error: "Missing sql" }, { status: 400 });
    }
    const result = await pool.query({ text: body.sql, rowMode: "array" });
    return NextResponse.json({ result: toResultSet(result) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import type { PgConnConfig } from "./pg-pool";

/**
 * MySQL access via mysql2. Same proxy model as Postgres/ClickHouse: the browser
 * sends SQL by connection id, the server runs it here and returns a
 * DatabaseResultSet. Supports write-back (transactions) since MySQL has PKs.
 *
 * mysql2 is configured to return dates/bigints/decimals as strings so the grid
 * shows them faithfully (no JS Date UTC drift, no >2^53 precision loss).
 */

const g = globalThis as unknown as { __mysqlPools?: Map<string, Pool> };
const pools: Map<string, Pool> = (g.__mysqlPools ??= new Map());

function poolKey(c: PgConnConfig): string {
  return [
    c.host,
    c.port || 3306,
    c.database ?? "",
    c.user ?? "",
    c.readOnly ? "ro" : "rw",
  ].join(":");
}

export function getMysqlPool(c: PgConnConfig): Pool {
  const key = poolKey(c);
  let pool = pools.get(key);
  if (!pool) {
    pool = mysql.createPool({
      host: c.host,
      port: c.port || 3306,
      user: c.user,
      password: c.password,
      database: c.database || undefined,
      ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
      connectionLimit: 5,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false, // keep DECIMAL as exact strings
    });
    pools.set(key, pool);
  }
  return pool;
}

export async function closeMysqlPool(c: PgConnConfig): Promise<void> {
  const key = poolKey(c);
  const pool = pools.get(key);
  if (!pool) return;
  pools.delete(key);
  await pool.end().catch(() => {});
}

export function mysqlPoolStatus(c: PgConnConfig): { connected: boolean } {
  return { connected: pools.has(poolKey(c)) };
}

export async function testMysql(
  c: PgConnConfig
): Promise<{ connected: boolean; error?: string }> {
  try {
    await getMysqlPool(c).query("SELECT 1");
    return { connected: true };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------- result shaping ----------------------------

// mysql2 field.type numeric codes -> ColumnType hint (TEXT=1, INTEGER=2, REAL=3, BLOB=4).
function columnType(code: number): number {
  if ([1, 2, 3, 9, 13].includes(code)) return 2; // TINY/SHORT/LONG/INT24/YEAR
  if ([4, 5].includes(code)) return 3; // FLOAT/DOUBLE
  if ([249, 250, 251, 252].includes(code)) return 4; // *BLOB
  // LONGLONG(8, bigint as string), DECIMAL(0/246 as string), strings, dates, json -> TEXT
  return 1;
}

interface Field {
  name: string;
  type: number;
}

function toHeaders(fields: Field[]) {
  const seen = new Set<string>();
  return fields.map((f) => {
    let name = f.name;
    let i = 0;
    while (seen.has(name)) name = `__${f.name}_${i++}`;
    seen.add(name);
    return { name, displayName: f.name, originalType: null, type: columnType(f.type) };
  });
}

function normalizeCell(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Buffer.isBuffer(v)) return v;
  // mysql2 parses JSON columns to objects/arrays — render as JSON text.
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  return v;
}

interface DatabaseResultSet {
  rows: Record<string, unknown>[];
  headers: {
    name: string;
    displayName: string;
    originalType: string | null;
    type: number;
  }[];
  stat: {
    rowsAffected: number;
    rowsRead: number | null;
    rowsWritten: number | null;
    queryDurationMs: number | null;
  };
  lastInsertRowid?: number;
}

function build(rows: unknown, fields: Field[] | undefined): DatabaseResultSet {
  const headers = toHeaders(fields ?? []);
  // Writes (INSERT/UPDATE/DDL) return a ResultSetHeader object, not an array.
  const dataRows = Array.isArray(rows) ? (rows as unknown[][]) : [];
  const objRows = dataRows.map((arr) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = normalizeCell(arr[i]);
      return o;
    }, {})
  );
  const affected =
    !Array.isArray(rows) && rows && typeof rows === "object"
      ? ((rows as { affectedRows?: number }).affectedRows ?? 0)
      : objRows.length;
  return {
    rows: objRows,
    headers,
    stat: {
      rowsAffected: affected,
      rowsRead: null,
      rowsWritten: null,
      queryDurationMs: null,
    },
  };
}

async function withConn<T>(
  c: PgConnConfig,
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getMysqlPool(c).getConnection();
  try {
    // Read-only pools set the session read-only so writes are rejected. The pool
    // key separates ro/rw, so this never bleeds into a read-write connection.
    if (c.readOnly) await conn.query("SET SESSION transaction_read_only = ON");
    return await fn(conn);
  } finally {
    conn.release();
  }
}

/** Run a single statement. `page` applies LIMIT/OFFSET for lazy pagination. */
export async function mysqlQuery(
  c: PgConnConfig,
  sql: string,
  page?: { limit: number; offset: number }
): Promise<DatabaseResultSet> {
  const finalSql = page ? `${sql.trim().replace(/;\s*$/, "")} LIMIT ${page.limit} OFFSET ${page.offset}` : sql;
  return withConn(c, async (conn) => {
    const [rows, fields] = await conn.query({ sql: finalSql, rowsAsArray: true });
    return build(rows, fields as unknown as Field[]);
  });
}

/** Run statements in one transaction (grid write-back). */
export async function mysqlTransaction(
  c: PgConnConfig,
  statements: string[]
): Promise<DatabaseResultSet[]> {
  return withConn(c, async (conn) => {
    await conn.beginTransaction();
    try {
      const results: DatabaseResultSet[] = [];
      for (const stmt of statements) {
        const [rows, fields] = await conn.query({ sql: stmt, rowsAsArray: true });
        results.push(build(rows, fields as unknown as Field[]));
      }
      await conn.commit();
      return results;
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    }
  });
}

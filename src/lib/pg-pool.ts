import { Pool } from "pg";

/**
 * Shared registry of live node-postgres pools, keyed per connection identity.
 * Used by the query proxy (to run SQL) and the connection manager (to report
 * status, disconnect, or retry a connection).
 */

export interface PgConnConfig {
  host: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  timezone?: string;
  readOnly?: boolean;
  driver?: string; // "postgres" (default) | "clickhouse"
}

export interface PoolStatus {
  connected: boolean;
  total: number;
  idle: number;
  waiting: number;
}

const pools = new Map<string, Pool>();

export function poolKey(c: PgConnConfig): string {
  return `${c.host}:${c.port}:${c.database ?? ""}:${c.user ?? ""}:${c.ssl ? 1 : 0}:${c.readOnly ? "ro" : "rw"}`;
}

export function getPool(c: PgConnConfig): Pool {
  const key = poolKey(c);
  let pool = pools.get(key);
  if (!pool) {
    const tz = (c.timezone ?? process.env.PMSQL_TZ)?.replace(
      /[^A-Za-z0-9_/+-]/g,
      ""
    );
    // Build server options: timezone + (for read-only connections) enforce
    // read-only at the Postgres level so every write/DDL is rejected by the DB.
    const opts = [
      tz ? `-c timezone=${tz}` : "",
      c.readOnly ? "-c default_transaction_read_only=on" : "",
    ]
      .filter(Boolean)
      .join(" ");
    pool = new Pool({
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password: c.password,
      ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
      options: opts || undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", () => {
      // Swallow idle-client errors so one dead socket doesn't crash the server.
    });
    pools.set(key, pool);
  }
  return pool;
}

/** True if a live pool currently exists for this connection. */
export function hasPool(c: PgConnConfig): boolean {
  return pools.has(poolKey(c));
}

export function poolStatus(c: PgConnConfig): PoolStatus {
  const pool = pools.get(poolKey(c));
  if (!pool) return { connected: false, total: 0, idle: 0, waiting: 0 };
  return {
    connected: pool.totalCount > 0,
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/** Close and remove the pool for a connection (DBeaver "disconnect"). */
export async function closePool(c: PgConnConfig): Promise<void> {
  const key = poolKey(c);
  const pool = pools.get(key);
  if (!pool) return;
  pools.delete(key);
  await pool.end().catch(() => {});
}

/** Test connectivity (DBeaver "retry"/"test"): ensures a pool and runs SELECT 1. */
export async function testConnection(
  c: PgConnConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const pool = getPool(c);
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

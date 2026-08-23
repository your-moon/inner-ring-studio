import { storeRoute, HttpError } from "@/lib/route";
import { clickhouseQuery, closeClickhouse } from "@/lib/clickhouse";
import { getConnectionStore, IS_CLOUD } from "@/lib/mode";
import {
  getLastRemoteChangeAt,
  scheduleBackgroundSync,
} from "@/lib/vault-sync";
import { closeMysqlPool, mysqlPoolStatus, testMysql } from "@/lib/mysql-pool";
import {
  closePool,
  poolStatus,
  testConnection,
  type PgConnConfig,
} from "@/lib/pg-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = getConnectionStore();

interface ConnLike {
  host: string;
  port: number;
  driver?: string;
  database?: string;
  user?: string;
  ssl?: boolean;
  password?: string;
  timezone?: string;
  readOnly?: boolean;
}

function configOf(c: ConnLike): PgConnConfig {
  return {
    host: c.host,
    port: c.port,
    database: c.database,
    user: c.user,
    ssl: c.ssl,
    password: c.password,
    timezone: c.timezone,
    readOnly: c.readOnly,
    driver: c.driver as PgConnConfig["driver"],
  };
}

// Driver-aware helpers so the connection manager works for pg / mysql / clickhouse.
function statusOf(c: ConnLike) {
  return c.driver === "mysql"
    ? mysqlPoolStatus(configOf(c))
    : poolStatus(configOf(c));
}
async function testOf(c: ConnLike) {
  if (c.driver === "mysql") return testMysql(configOf(c));
  if (c.driver === "clickhouse") {
    try {
      await clickhouseQuery(configOf(c), "SELECT 1");
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return testConnection(configOf(c));
}
async function closeOf(c: ConnLike) {
  if (c.driver === "mysql") return closeMysqlPool(configOf(c));
  if (c.driver === "clickhouse") return closeClickhouse(configOf(c));
  return closePool(configOf(c));
}

/** Connection-manager status: which connections have a live pool. */
export const GET = storeRoute({}, async ({ ctx }) => {
  // The nav polls this every 5s — piggyback the throttled git-vault pull here,
  // and report syncedAt so the client can toast when remote changes land.
  if (!IS_CLOUD) scheduleBackgroundSync();
  const connections = (await store.list(ctx)).map((c) => ({
    id: c.id,
    name: c.name,
    driver: c.driver,
    folder: c.folder,
    readOnly: !!c.readOnly,
    environment: c.environment,
    host: c.host,
    port: c.port,
    database: c.database,
    status: statusOf(c), // password not needed for the pool key
  }));
  return { connections, syncedAt: IS_CLOUD ? 0 : getLastRemoteChangeAt() };
});

/** Actions: disconnect (close pool) or test/retry (SELECT 1). */
export const POST = storeRoute({}, async ({ ctx, body }) => {
  const b = body as { connectionId?: string; action?: string; value?: unknown };
  const conn = b.connectionId ? await store.get(ctx, b.connectionId) : undefined;
  if (!conn) throw new HttpError(400, "unknown connection");

  if (b.action === "disconnect") {
    await closeOf(conn);
    return { ok: true, status: statusOf(conn) };
  }
  if (b.action === "test" || b.action === "retry") {
    const result = await testOf(conn);
    return { ...result, status: statusOf(conn) };
  }
  if (b.action === "readonly") {
    // Close the current pool so the new read-only/read-write mode takes effect
    // (mode is applied at pool/connection setup).
    await closeOf(conn);
    await store.update(ctx, conn.id, { readOnly: !!b.value });
    return { ok: true, readOnly: !!b.value };
  }
  throw new HttpError(400, "unknown action");
});

import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type { PgConnConfig } from "./pg-pool";

/**
 * ClickHouse access over its HTTP interface (@clickhouse/client). Read-focused:
 * connect, browse, and run SQL. ClickHouse is OLAP and has no row-level
 * UPDATE/DELETE, so there is no grid write-back.
 */

const clients = new Map<string, ClickHouseClient>();

function urlFor(c: PgConnConfig): string {
  const scheme = c.ssl ? "https" : "http";
  return `${scheme}://${c.host}:${c.port || 8123}`;
}

function keyFor(c: PgConnConfig): string {
  return `${urlFor(c)}:${c.database ?? ""}:${c.user ?? ""}`;
}

export function getClickhouse(c: PgConnConfig): ClickHouseClient {
  const key = keyFor(c);
  let client = clients.get(key);
  if (!client) {
    client = createClient({
      url: urlFor(c),
      username: c.user,
      password: c.password,
      database: c.database || "default",
      request_timeout: 30_000,
      clickhouse_settings: c.readOnly ? { readonly: 1 } : {},
    });
    clients.set(key, client);
  }
  return client;
}

export async function closeClickhouse(c: PgConnConfig): Promise<void> {
  const key = keyFor(c);
  const client = clients.get(key);
  if (!client) return;
  clients.delete(key);
  await client.close().catch(() => {});
}

// ClickHouse type -> Outerbase ColumnType hint (TEXT=1, INTEGER=2, REAL=3, BLOB=4)
function columnType(chType: string): number {
  const t = chType.replace(/^Nullable\(|\)$/g, "").replace(/^LowCardinality\(|\)$/g, "");
  if (/^U?Int/.test(t)) return 2;
  if (/^(Float|Decimal)/.test(t)) return 3;
  return 1;
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

export async function clickhouseQuery(
  c: PgConnConfig,
  sql: string
): Promise<DatabaseResultSet> {
  const client = getClickhouse(c);
  const isSelectLike = /^\s*(select|with|show|describe|desc|explain)\b/i.test(sql);

  if (!isSelectLike) {
    // DDL / commands: use command() (no result set).
    await client.command({ query: sql });
    return {
      rows: [],
      headers: [],
      stat: {
        rowsAffected: 0,
        rowsRead: null,
        rowsWritten: null,
        queryDurationMs: null,
      },
    };
  }

  const rs = await client.query({ query: sql, format: "JSONCompact" });
  const json = (await rs.json()) as {
    meta?: { name: string; type: string }[];
    data?: unknown[][];
  };
  const meta = json.meta ?? [];
  const seen = new Set<string>();
  const headers = meta.map((m) => {
    let name = m.name;
    let i = 0;
    while (seen.has(name)) name = `__${m.name}_${i++}`;
    seen.add(name);
    return {
      name,
      displayName: m.name,
      originalType: m.type,
      type: columnType(m.type),
    };
  });
  const rows = (json.data ?? []).map((arr) =>
    headers.reduce<Record<string, unknown>>((o, h, i) => {
      o[h.name] = arr[i];
      return o;
    }, {})
  );
  return {
    rows,
    headers,
    stat: {
      rowsAffected: rows.length,
      rowsRead: null,
      rowsWritten: null,
      queryDurationMs: null,
    },
  };
}

import {
  createClient,
  type ClickHouseClient,
  type ClickHouseSettings,
} from "@clickhouse/client";
import type { PgConnConfig } from "./pg-pool";
import { assembleResultSet, type DatabaseResultSet } from "./result-set";

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
      // Browse results compress well; cheap CPU for less transfer over the proxy.
      compression: { response: true },
      clickhouse_settings: {
        // readonly:2 blocks writes/DDL like readonly:1 but (unlike :1) still lets
        // us attach the guardrail + pagination settings below in the same request.
        ...(c.readOnly ? { readonly: 2 } : {}),
        // Keep Int64/UInt64 as JSON strings so JS Number never rounds ids > 2^53.
        // (The server default for this flipped to 0 in ClickHouse 25.8.)
        output_format_json_quote_64bit_integers: 1,
        // Safety ceilings so one browse query can't hang / OOM a shared cluster.
        max_execution_time: 30,
        max_result_rows: "1000000",
        result_overflow_mode: "break",
        max_memory_usage: "4000000000",
      } as ClickHouseSettings,
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

// ClickHouse type -> ColumnType hint (TEXT=1, INTEGER=2, REAL=3, BLOB=4)
function columnType(chType: string): number {
  const t = chType.replace(/^Nullable\(|\)$/g, "").replace(/^LowCardinality\(|\)$/g, "");
  // 64-bit+ integers arrive as JSON strings (see output_format_json_quote_64bit_integers)
  // and would lose precision if coerced to a JS Number — keep them as TEXT.
  if (/^U?Int(64|128|256)\b/.test(t)) return 1;
  if (/^U?Int/.test(t)) return 2;
  if (/^Float/.test(t)) return 3;
  // Decimal is exact; showing it as REAL (JS float) would lose precision — TEXT.
  return 1;
}

export async function clickhouseQuery(
  c: PgConnConfig,
  sql: string,
  page?: { limit: number; offset: number }
): Promise<DatabaseResultSet> {
  const client = getClickhouse(c);
  const isSelectLike = /^\s*(select|with|show|describe|desc|explain)\b/i.test(sql);

  if (!isSelectLike) {
    // DDL / commands: use command() (no result set).
    await client.command({ query: sql });
    return assembleResultSet([], [], { rowsAffected: 0 });
  }

  // Paginate via the outermost `limit`/`offset` settings rather than editing the
  // SQL text — this applies regardless of the query's own ORDER BY / trailing
  // SETTINGS clause (appending "LIMIT" after "SETTINGS ..." is a syntax error).
  const rs = await client.query({
    query: sql,
    format: "JSONCompact",
    clickhouse_settings: page
      ? { limit: String(page.limit), offset: String(page.offset) }
      : {},
  });
  const json = (await rs.json()) as {
    meta?: { name: string; type: string }[];
    data?: unknown[][];
  };
  // ClickHouse supplies its type-map + the raw type string as originalType;
  // header dedup + row assembly live in @/lib/result-set. No cell normalizer —
  // JSONCompact values are already grid-ready.
  const columns = (json.meta ?? []).map((m) => ({
    name: m.name,
    originalType: m.type,
    type: columnType(m.type),
  }));
  return assembleResultSet(columns, json.data ?? []);
}

import { getPool, type PgConnConfig } from "./pg-pool";
import { clickhouseQuery } from "./clickhouse";
import { mysqlQuery } from "./mysql-pool";

export type RunnerDriver = "postgres" | "mysql" | "clickhouse";

export interface RunResult {
  columns: string[];
  /** Rows as positional arrays (compact for snapshotting), aligned to `columns`. */
  rows: unknown[][];
  rowCount: number;
}

/**
 * Execute one SQL statement against a connection and return a normalized result.
 * Shared by the query API and the scheduler so a scheduled run behaves exactly
 * like running the query in the editor. Driver-agnostic.
 */
export async function runQuery(
  driver: RunnerDriver,
  cfg: PgConnConfig,
  sql: string
): Promise<RunResult> {
  if (driver === "clickhouse") {
    const r = await clickhouseQuery(cfg, sql);
    const columns = r.headers.map((h) => h.name);
    return { columns, rows: r.rows.map((row) => columns.map((c) => row[c])), rowCount: r.rows.length };
  }
  if (driver === "mysql") {
    const r = await mysqlQuery(cfg, sql);
    const columns = r.headers.map((h) => h.name);
    return { columns, rows: r.rows.map((row) => columns.map((c) => row[c])), rowCount: r.rows.length };
  }
  // Postgres.
  const res = await getPool(cfg).query({ text: sql });
  const columns = res.fields.map((f) => f.name);
  const rows = res.rows.map((row: Record<string, unknown>) => columns.map((c) => row[c]));
  return { columns, rows, rowCount: res.rowCount ?? rows.length };
}

/**
 * The metric a schedule's alert rule is evaluated against:
 * - 'rowcount' → number of rows returned
 * - 'value'    → the first cell (row 0, col 0) coerced to a number, or NaN
 */
export function extractMetric(metric: "rowcount" | "value", r: RunResult): number {
  if (metric === "rowcount") return r.rowCount;
  const cell = r.rows[0]?.[0];
  if (cell === null || cell === undefined) return NaN;
  const n = typeof cell === "number" ? cell : Number(String(cell));
  return n;
}

export type AlertOp = "gt" | "gte" | "lt" | "lte" | "eq" | "ne" | "changed";

/** Evaluate whether an alert should fire. `prev` is the last metric (for 'changed'). */
export function evalAlert(
  op: AlertOp | null | undefined,
  value: number | null | undefined,
  metric: number,
  prev: number | null | undefined
): boolean {
  if (!op) return false;
  if (Number.isNaN(metric)) return false;
  switch (op) {
    case "gt":
      return value != null && metric > value;
    case "gte":
      return value != null && metric >= value;
    case "lt":
      return value != null && metric < value;
    case "lte":
      return value != null && metric <= value;
    case "eq":
      return value != null && metric === value;
    case "ne":
      return value != null && metric !== value;
    case "changed":
      return prev != null && metric !== prev;
    default:
      return false;
  }
}

/** Trim a result to a small snapshot safe to store as JSON. */
export function snapshot(r: RunResult, maxRows = 50, maxCols = 12) {
  const columns = r.columns.slice(0, maxCols);
  const rows = r.rows.slice(0, maxRows).map((row) => row.slice(0, maxCols));
  return { columns, rows };
}

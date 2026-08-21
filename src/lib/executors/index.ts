import type { PgConnConfig } from "@/lib/pg-pool";
import { clickhouseExecutor } from "./clickhouse";
import { mysqlExecutor } from "./mysql";
import { postgresExecutor } from "./postgres";

export interface FetchMoreResult {
  rows: unknown[];
  hasMore: boolean;
  nextCursorId?: string | null;
  expired?: boolean;
}
export interface PaginateResult {
  result: unknown;
  cursorId: string | null;
  hasMore: boolean;
}
export interface SingleResult {
  result: unknown;
  truncated?: boolean;
}

/**
 * The per-dialect execution seam. The query route decodes a request once and
 * dispatches to one of these; each adapter owns its dialect's quirks — Postgres
 * held cursors + top-N cap, MySQL/ClickHouse stateless offset paging,
 * transactions or their absence. `cursorId` is opaque to the route.
 */
export interface QueryExecutor {
  closeCursor(cfg: PgConnConfig, cursorId: string): Promise<void>;
  fetchMore(
    cfg: PgConnConfig,
    cursorId: string,
    pageSize: number
  ): Promise<FetchMoreResult>;
  statements(
    cfg: PgConnConfig,
    statements: string[]
  ): Promise<{ results: unknown[] }>;
  paginate(
    cfg: PgConnConfig,
    sql: string,
    pageSize: number
  ): Promise<PaginateResult>;
  single(cfg: PgConnConfig, sql: string): Promise<SingleResult>;
}

/** Pick the executor for a connection's driver. Unknown / undefined / "postgres"
 *  all map to Postgres, matching the route's original fall-through. */
export function executorFor(driver: string | undefined): QueryExecutor {
  if (driver === "clickhouse") return clickhouseExecutor;
  if (driver === "mysql") return mysqlExecutor;
  return postgresExecutor;
}

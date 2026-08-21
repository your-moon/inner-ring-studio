import { clampPageSize } from "@/lib/query-cursor";

/**
 * One decoded query verb. This is the request protocol that used to be decoded
 * separately inside each dialect branch of the query route; a single pure
 * decoder makes it unit-testable and keeps the route dialect-agnostic.
 */
export type QueryRequest =
  | { kind: "close"; cursorId: string }
  | { kind: "fetchMore"; cursorId: string; pageSize: number }
  | { kind: "statements"; statements: string[] }
  | { kind: "paginate"; sql: string; pageSize: number }
  | { kind: "single"; sql: string }
  | { kind: "error"; message: string };

interface QueryBody {
  closeCursorId?: unknown;
  cursorId?: unknown;
  fetchMore?: unknown;
  statements?: unknown;
  sql?: unknown;
  paginate?: unknown;
}

/**
 * Decode the /api/query body into exactly one verb. Order matters and matches
 * the original per-dialect branch order: close, fetch-more, statements, then
 * (sql required) paginate, single. `pageSize` is clamped here so executors
 * never see an out-of-range page size.
 */
export function decodeQueryRequest(body: QueryBody): QueryRequest {
  if (typeof body.closeCursorId === "string") {
    return { kind: "close", cursorId: body.closeCursorId };
  }
  if (typeof body.cursorId === "string" && body.fetchMore != null) {
    return {
      kind: "fetchMore",
      cursorId: body.cursorId,
      pageSize: clampPageSize(body.fetchMore as number),
    };
  }
  if (Array.isArray(body.statements)) {
    return { kind: "statements", statements: body.statements as string[] };
  }
  if (typeof body.sql !== "string") {
    return { kind: "error", message: "Missing sql" };
  }
  if (body.paginate != null) {
    return {
      kind: "paginate",
      sql: body.sql,
      pageSize: clampPageSize(body.paginate as number),
    };
  }
  return { kind: "single", sql: body.sql };
}

import { clickhouseQuery } from "@/lib/clickhouse";
import type {
  FetchMoreResult,
  PaginateResult,
  QueryExecutor,
  SingleResult,
} from "./index";
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
  pageableSelect,
} from "./offset-cursor";

// ClickHouse: stateless HTTP, no server-side cursor, no transactions. Lazy
// pagination uses LIMIT/OFFSET carried in an opaque token; statements run
// sequentially (no atomicity).
export const clickhouseExecutor: QueryExecutor = {
  // Stateless — no held cursor to release.
  async closeCursor() {},

  async fetchMore(cfg, cursorId, pageSize): Promise<FetchMoreResult> {
    const dec = decodeOffsetCursor(cursorId);
    if (!dec) return { expired: true, rows: [], hasMore: false };
    const rs = await clickhouseQuery(cfg, dec.sql, {
      limit: pageSize,
      offset: dec.offset,
    });
    const hasMore = rs.rows.length >= pageSize;
    return {
      rows: rs.rows,
      hasMore,
      nextCursorId: hasMore
        ? encodeOffsetCursor(dec.sql, dec.offset + pageSize)
        : null,
    };
  },

  async statements(cfg, statements) {
    const results = [];
    for (const stmt of statements) results.push(await clickhouseQuery(cfg, stmt));
    return { results };
  },

  async paginate(cfg, sql, pageSize): Promise<PaginateResult> {
    // First page: cap a plain read with LIMIT and hand back an offset cursor so
    // the grid can lazily load more as the user scrolls.
    const pageable = pageableSelect(sql);
    if (pageable) {
      const rs = await clickhouseQuery(cfg, pageable, {
        limit: pageSize,
        offset: 0,
      });
      const hasMore = rs.rows.length >= pageSize;
      return {
        result: rs,
        cursorId: hasMore ? encodeOffsetCursor(pageable, pageSize) : null,
        hasMore,
      };
    }
    // Not pageable (SHOW/DESCRIBE, explicit LIMIT, FORMAT) — run verbatim.
    return {
      result: await clickhouseQuery(cfg, sql),
      cursorId: null,
      hasMore: false,
    };
  },

  async single(cfg, sql): Promise<SingleResult> {
    return { result: await clickhouseQuery(cfg, sql) };
  },
};

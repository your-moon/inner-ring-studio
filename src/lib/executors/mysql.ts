import { mysqlQuery, mysqlTransaction } from "@/lib/mysql-pool";
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

// MySQL: stateless like ClickHouse (LIMIT/OFFSET pagination via an opaque
// token), but supports write-back transactions.
export const mysqlExecutor: QueryExecutor = {
  async closeCursor() {},

  async fetchMore(cfg, cursorId, pageSize): Promise<FetchMoreResult> {
    const dec = decodeOffsetCursor(cursorId);
    if (!dec) return { expired: true, rows: [], hasMore: false };
    const rs = await mysqlQuery(cfg, dec.sql, {
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
    return { results: await mysqlTransaction(cfg, statements) };
  },

  async paginate(cfg, sql, pageSize): Promise<PaginateResult> {
    const pageable = pageableSelect(sql);
    if (pageable) {
      const rs = await mysqlQuery(cfg, pageable, { limit: pageSize, offset: 0 });
      const hasMore = rs.rows.length >= pageSize;
      return {
        result: rs,
        cursorId: hasMore ? encodeOffsetCursor(pageable, pageSize) : null,
        hasMore,
      };
    }
    return {
      result: await mysqlQuery(cfg, sql),
      cursorId: null,
      hasMore: false,
    };
  },

  async single(cfg, sql): Promise<SingleResult> {
    return { result: await mysqlQuery(cfg, sql) };
  },
};

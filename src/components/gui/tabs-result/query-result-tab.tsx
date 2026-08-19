import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { DatabasePage } from "@/drivers/base-driver";
import { MultipleQueryResult } from "@/lib/sql/multiple-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AggregateResultButton from "../aggregate-result/aggregate-result-button";
import ExportResultButton from "../export/export-result-button";
import ResultTable from "../query-result-table";
import ResultStats from "../result-stat";
import { createTableStateFromResult } from "../table-result/helper";

const PAGE_SIZE = 200;

// The transport methods the paginated editor path relies on (present on the
// Postgres driver; absent on drivers that don't support held cursors).
interface Paginator {
  fetchMorePage?: (cursorId: string, pageSize: number) => Promise<DatabasePage>;
  closePage?: (cursorId: string) => Promise<void>;
}

export default function QueryResult({
  result,
}: {
  result: MultipleQueryResult;
}) {
  const { databaseDriver } = useStudioContext();
  const { schema } = useSchema();

  // We cache the schema to prevent re-initial
  // the state when schema changes and lost all the
  // changes in the table
  const [cachedSchemas] = useState(schema);

  const data = useMemo(() => {
    const state = createTableStateFromResult({
      driver: databaseDriver,
      result: result.result,
      schemas: cachedSchemas,
    });

    state.setReadOnlyMode(true);
    state.setSql(result.sql);
    return state;
  }, [result, databaseDriver, cachedSchemas]);

  // --- Lazy pagination (load more rows from a held server cursor on scroll) ---
  const cursorRef = useRef<string | null>(result.result.cursorId ?? null);
  const loadingRef = useRef(false);
  const [hasMore, setHasMore] = useState<boolean>(
    Boolean(result.result.hasMore)
  );
  const [loadedCount, setLoadedCount] = useState<number>(data.getRowsCount());

  // Reset pagination state whenever a new result is shown in this tab.
  useEffect(() => {
    cursorRef.current = result.result.cursorId ?? null;
    setHasMore(Boolean(result.result.hasMore));
    setLoadedCount(data.getRowsCount());
  }, [result, data]);

  // Release the held cursor when the tab unmounts (best-effort).
  useEffect(() => {
    const drv = databaseDriver as unknown as Paginator;
    return () => {
      if (cursorRef.current) drv.closePage?.(cursorRef.current);
    };
  }, [databaseDriver]);

  const loadMore = useCallback(async () => {
    const drv = databaseDriver as unknown as Paginator;
    if (loadingRef.current || !cursorRef.current || !drv.fetchMorePage) return;
    loadingRef.current = true;
    try {
      const page = await drv.fetchMorePage(cursorRef.current, PAGE_SIZE);
      if (page.expired) {
        cursorRef.current = null;
        setHasMore(false);
        return;
      }
      data.appendData(page.rows as Record<string, unknown>[]);
      setLoadedCount(data.getRowsCount());
      setHasMore(page.hasMore);
      // ClickHouse (stateless) returns the next page's token; adopt it. Postgres
      // (held cursor) omits it and the same id keeps advancing server-side.
      if (page.nextCursorId !== undefined) cursorRef.current = page.nextCursorId;
      if (!page.hasMore) cursorRef.current = null;
    } catch {
      // Leave hasMore as-is; a transient error shouldn't kill the cursor UI.
    } finally {
      loadingRef.current = false;
    }
  }, [databaseDriver, data]);

  const stats = result.result.stat;

  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="grow overflow-hidden">
        <ResultTable
          data={data}
          onScrollToBottom={hasMore ? loadMore : undefined}
        />
      </div>
      {stats && (
        <div className="flex shrink-0 justify-between border-t">
          <div className="flex items-center p-1">
            <ResultStats stats={stats} />
            {hasMore && (
              <span className="ml-2 text-xs text-neutral-400">
                {loadedCount.toLocaleString()} loaded, scroll for more…
              </span>
            )}
            <div>
              <ExportResultButton data={data} />
            </div>
          </div>
          <div className="p-1 pr-3">
            <AggregateResultButton data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

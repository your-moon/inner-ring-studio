import ResultTable from "@/components/gui/query-result-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/orbit/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutoComplete } from "@/context/auto-complete-provider";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import {
  ColumnSortOption,
  DatabaseResultStat,
  DatabaseTableSchema,
} from "@/drivers/base-driver";
import { KEY_BINDING } from "@/lib/key-matcher";
import { commitChange } from "@/lib/sql/sql-execute-helper";
import { buildFilterWhere } from "@/lib/sql/filter-where";
import {
  canGoPrev,
  nextOffset,
  parsePageValue,
  prevOffset,
} from "@/lib/table-pagination";
import { escapeSqlValue } from "@/drivers/sqlite/sql-helper";
import { AlertDialogTitle } from "@radix-ui/react-alert-dialog";
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideRefreshCcw,
  LucideX,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SavedView } from "@/lib/saved-views";
import SavedViewsButton from "../table-result/saved-views-button";
import ImportCsvDialog from "../import-csv-dialog";
import AggregateResultButton from "../aggregate-result/aggregate-result-button";
import ExportResultButton from "../export/export-result-button";
import ShareResultButton from "../share/share-result-button";
import OpacityLoading from "../loading-opacity";
import ResultStats from "../result-stat";
import OptimizeTableState from "../table-optimized/optimize-table-state";
import useTableResultColumnFilter from "../table-result/filter-column";
import { createTableStateFromResult } from "../table-result/helper";
import { TableHeaderMetadata } from "../table-result/type";
import { Toolbar } from "../toolbar";
import { useCurrentTab } from "../windows-tab";

interface TableDataContentProps {
  tableName: string;
  schemaName: string;
}

export default function TableDataWindow({
  schemaName,
  tableName,
}: TableDataContentProps) {
  const { updateTableSchema } = useAutoComplete();
  const { schema } = useSchema();
  const { databaseDriver } = useStudioContext();
  const [error, setError] = useState<string>();
  const [executeError, setExecuteError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptimizeTableState<TableHeaderMetadata>>();
  const [tableSchema, setTableSchema] = useState<DatabaseTableSchema>();
  const [stat, setStat] = useState<DatabaseResultStat>();
  const [sortColumns, setSortColumns] = useState<ColumnSortOption[]>([]);
  const [changeNumber, setChangeNumber] = useState(0);

  const [where, setWhere] = useState("");
  const [whereInput, setWhereInput] = useState("");

  // Per-column search → real SERVER-SIDE WHERE (searches the whole table, not
  // just loaded rows). Combined with the manual `where` filter below.
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const effectiveWhere = useMemo(
    () =>
      buildFilterWhere(
        databaseDriver.getFlags().dialect,
        where,
        columnFilters,
        escapeSqlValue
      ),
    [where, columnFilters, databaseDriver]
  );

  const onColumnFilterChange = useCallback((col: string, term: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (term.trim()) next[col] = term;
      else delete next[col];
      return next;
    });
    // A new search starts from the first page.
    setFinalOffset(0);
    setOffset("0");
  }, []);

  const [offset, setOffset] = useState("0");
  const [limit, setLimit] = useState("50");

  const [finalOffset, setFinalOffset] = useState(0);
  const [finalLimit, setFinalLimit] = useState(50);
  const [isExecuting, setIsExecuting] = useState(false);

  const [revision, setRevision] = useState(1);
  const [lastQueryTimestamp, setLastQueryTimestamp] = useState(0);

  // We cache the schema to prevent re-initial
  // the state when schema changes and lost all the
  // changes in the table
  const [cachedSchema] = useState(() => schema);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const { data: dataResult, schema: schemaResult } =
          await databaseDriver.selectTable(schemaName, tableName, {
            whereRaw: effectiveWhere,
            limit: finalLimit,
            offset: finalOffset,
            orderBy: sortColumns,
          });

        const tableState = createTableStateFromResult({
          driver: databaseDriver,
          result: dataResult,
          tableSchema: schemaResult,
          schemas: cachedSchema,
        });

        tableState.setSql("SELECT * FROM " + tableName + ";");

        // Remember per-table column widths (keyed by connection + table).
        tableState.enableWidthPersistence(
          `colwidth:${pathname}:${schemaName}.${tableName}`
        );

        setData(tableState);

        setStat(dataResult.stat);
        setTableSchema(schemaResult);
        updateTableSchema(tableName, schemaResult.columns);
        setLastQueryTimestamp(Date.now());
        setChangeNumber(0);
        setError(undefined);
      } catch (e) {
        setError((e as Error).toString());
      } finally {
        setLoading(false);
      }
    };

    fetchData().then().catch(console.error);
  }, [
    databaseDriver,
    tableName,
    schemaName,
    sortColumns,
    updateTableSchema,
    setStat,
    effectiveWhere,
    finalOffset,
    finalLimit,
    revision,
    cachedSchema,
  ]);

  useEffect(() => {
    if (data) {
      const callback = (state: OptimizeTableState) => {
        setChangeNumber(state.getChangedRows().length);
      };
      data.addChangeListener(callback);
      return () => data.removeChangeListener(callback);
    }
  }, [data]);

  const { columnIndexList, setColumnIndexList, filterColumnButton } =
    useTableResultColumnFilter({
      state: data,
    });

  const pathname = usePathname();
  const viewScope = `${pathname}:${schemaName}.${tableName}`;
  const [showImport, setShowImport] = useState(false);

  // The visible-column names for the current view (undefined when all visible).
  const currentColumns = useMemo(() => {
    if (!data) return undefined;
    const headers = data.getHeaders();
    if (columnIndexList.length === headers.length) return undefined;
    return columnIndexList
      .map((i) => headers[i]?.name)
      .filter((n): n is string => !!n);
  }, [data, columnIndexList]);

  const applyView = useCallback(
    (view: SavedView) => {
      setWhere(view.where);
      setWhereInput(view.where);
      setSortColumns(view.sortColumns);
      if (data) {
        const headers = data.getHeaders();
        if (view.columns) {
          const nameToIndex = new Map(headers.map((h, i) => [h.name, i]));
          setColumnIndexList(
            view.columns
              .map((n) => nameToIndex.get(n))
              .filter((i): i is number => i !== undefined)
              .sort((a, b) => a - b)
          );
        } else {
          setColumnIndexList(headers.map((_, i) => i)); // all columns
        }
      }
    },
    [data, setColumnIndexList]
  );

  const onCommit = useCallback(() => {
    if (!tableSchema) return;
    if (!data) return;

    setIsExecuting(true);

    commitChange({ driver: databaseDriver, tableName, tableSchema, data })
      .then(({ errorMessage }) => {
        if (errorMessage) setExecuteError(errorMessage);
      })
      .catch(console.error)
      .finally(() => setIsExecuting(false));
  }, [databaseDriver, tableName, tableSchema, data, setExecuteError]);

  const onDiscard = useCallback(() => {
    if (data) {
      data.discardAllChange();
    }
  }, [data]);

  const onNewRow = useCallback(() => {
    if (data) {
      data.insertNewRow();
    }
  }, [data]);

  const onRemoveRow = useCallback(() => {
    if (data) {
      data.getSelectedRowIndex().forEach((index) => {
        data.removeRow(index);
      });
    }
  }, [data]);

  const { isActiveTab } = useCurrentTab();

  useEffect(() => {
    if (isActiveTab) {
      const handleGlobalKeyBinding = (e: KeyboardEvent) => {
        if (KEY_BINDING.commit.match(e)) {
          onCommit();
          e.preventDefault();
          e.stopPropagation();
        } else if (KEY_BINDING.discard.match(e)) {
          onDiscard();
          e.preventDefault();
          e.stopPropagation();
        }
      };

      document.addEventListener("keydown", handleGlobalKeyBinding);
      return () =>
        document.removeEventListener("keydown", handleGlobalKeyBinding);
    }
  }, [isActiveTab, onCommit, onDiscard]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {executeError && (
        <AlertDialog open={true}>
          <AlertDialogContent title="Error">
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{executeError} </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setExecuteError(null)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {showImport && tableSchema && (
        <ImportCsvDialog
          driver={databaseDriver}
          schemaName={schemaName}
          tableName={tableName}
          columns={tableSchema.columns.map((c) => c.name)}
          onClose={() => setShowImport(false)}
          onImported={() => setRevision((p) => p + 1)}
        />
      )}
      <div className="shrink-0 grow-0 border-b border-neutral-200 py-2 dark:border-neutral-800">
        <Toolbar>
          <div className="ml-2 flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant={"secondary"}
              onClick={() => setRevision((prev) => prev + 1)}
              disabled={loading}
            >
              <LucideRefreshCcw className="h-4 w-4" />
            </Button>

            <Button
              variant={"secondary"}
              onClick={onNewRow}
              className="flex items-center gap-1"
            >
              <div className="text-sm">Add row</div>
            </Button>

            <Button variant={"secondary"} onClick={onRemoveRow}>
              <div className="text-sm">Delete row</div>
            </Button>

            <SavedViewsButton
              scope={viewScope}
              currentWhere={where}
              currentSort={sortColumns}
              currentColumns={currentColumns}
              onApply={applyView}
            />

            {tableSchema && tableSchema.columns.length > 0 && (
              <Button variant={"secondary"} onClick={() => setShowImport(true)}>
                <div className="text-sm">Import</div>
              </Button>
            )}
          </div>

          <div className="mx-2 flex min-w-0 grow">
            <div className="flex w-full items-center overflow-hidden rounded border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              {filterColumnButton}
              <input
                type="text"
                placeholder="eg: id=5"
                value={whereInput}
                onChange={(e) => setWhereInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setWhere(e.currentTarget.value);
                  }
                }}
                className="h-full grow p-2 pr-2 pl-3 font-mono text-sm outline-hidden"
              />
            </div>
          </div>

          <div className="mr-2 flex shrink-0 flex-row-reverse items-center gap-2">
            {/* <ToolbarButton
              text="Save"
              // icon={<LucideSaveAll className="h-4 w-4" />}
              tooltip={`Commit your changes (${KEY_BINDING.commit.toString()})`}
              disabled={!changeNumber || isExecuting}
              loading={isExecuting}
              onClick={onCommit}
              badge={changeNumber ? changeNumber.toString() : ""}
            />

            <ToolbarButton
              text="Discard"
              tooltip={`Dicard all changes (${KEY_BINDING.discard.toString()})`}
              destructive
              disabled={!changeNumber}
              onClick={onDiscard}
            /> */}

            {changeNumber ? (
              <>
                <Button
                  variant={"primary"}
                  onClick={onCommit}
                  loading={isExecuting}
                  disabled={!changeNumber || isExecuting}
                >
                  <div className="text-sm">
                    Save {changeNumber} {changeNumber === 1 ? "change" : "changes"}
                  </div>
                </Button>

                <Button variant={"destructive"} onClick={onDiscard}>
                  <div className="text-sm">Discard</div>
                </Button>
              </>
            ) : (
              <></>
            )}
          </div>
        </Toolbar>
      </div>
      <div className="relative grow overflow-hidden">
        {loading && <OpacityLoading />}
        {error && (
          <div className="p-5 text-red-500">
            <pre>{error}</pre>
          </div>
        )}
        {Object.entries(columnFilters).some(([, v]) => v.trim()) && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50">
            <span className="text-xs text-neutral-500">Filters:</span>
            {Object.entries(columnFilters)
              .filter(([, v]) => v.trim())
              .map(([col, term]) => (
                <span
                  key={col}
                  className="flex items-center gap-1 rounded-full bg-[#FFEB02]/20 py-0.5 pr-1 pl-2 text-xs"
                >
                  <span className="font-medium">{col}</span>
                  <span className="text-neutral-500">contains “{term}”</span>
                  <button
                    onClick={() => onColumnFilterChange(col, "")}
                    className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                    title="Remove filter"
                  >
                    <LucideX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            <button
              onClick={() => {
                setColumnFilters({});
                setFinalOffset(0);
                setOffset("0");
              }}
              className="ml-1 text-xs text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Clear all
            </button>
          </div>
        )}
        {data && !error ? (
          <ResultTable
            data={data}
            tableName={tableName}
            key={lastQueryTimestamp}
            sortColumns={sortColumns}
            onSortColumnChange={setSortColumns}
            visibleColumnIndexList={columnIndexList}
            columnFilters={columnFilters}
            onColumnFilterChange={onColumnFilterChange}
          />
        ) : null}
      </div>
      {stat && data && (
        <div className="flex h-12 shrink-0 justify-between border-t">
          <div className="flex items-center p-1 px-2">
            <div>
              <ExportResultButton data={data} />
            </div>
            <ShareResultButton data={data} />
            <ResultStats stats={stat} />
          </div>
          <div className="p-1 pr-3">
            <AggregateResultButton data={data} />
          </div>

          <div className="mr-3 flex items-center gap-2">
            <Button
              variant={"secondary"}
              size={"sm"}
              disabled={!canGoPrev(finalOffset) || loading}
              onClick={() => {
                const o = prevOffset(finalOffset, finalLimit);
                setFinalOffset(o);
                setOffset(o.toString());
              }}
              style={{ width: 32, height: 32 }}
            >
              <LucideArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <input
                    value={limit}
                    onChange={(e) => setLimit(e.currentTarget.value)}
                    onBlur={(e) => {
                      const v = parsePageValue(
                        e.currentTarget.value,
                        finalLimit
                      );
                      if (v !== finalLimit) setFinalLimit(v);
                      setLimit(v.toString());
                    }}
                    style={{ width: 50 }}
                    className="h-8 rounded bg-neutral-200 p-1 pr-2 pl-2 text-xs dark:bg-neutral-900"
                    alt="Limit"
                  />
                </TooltipTrigger>
                <TooltipContent>Limit</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <input
                    value={offset}
                    onChange={(e) => setOffset(e.currentTarget.value)}
                    onBlur={(e) => {
                      const v = parsePageValue(
                        e.currentTarget.value,
                        finalOffset
                      );
                      if (v !== finalOffset) setFinalOffset(v);
                      setOffset(v.toString());
                    }}
                    style={{ width: 50 }}
                    className="h-full rounded bg-neutral-200 p-1 pr-2 pl-2 text-xs dark:bg-neutral-900"
                    alt="Offset"
                  />
                </TooltipTrigger>
                <TooltipContent>Offset</TooltipContent>
              </Tooltip>
            </div>

            <Button
              variant={"secondary"}
              size={"sm"}
              disabled={loading}
              style={{ width: 32, height: 32 }}
            >
              <LucideArrowRight
                className="h-4 w-4"
                onClick={() => {
                  const o = nextOffset(finalOffset, finalLimit);
                  setFinalOffset(o);
                  setOffset(o.toString());
                }}
              />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

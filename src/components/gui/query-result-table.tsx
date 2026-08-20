import OptimizeTable, {
  OptimizeTableHeaderWithIndexProps,
} from "@/components/gui/table-optimized";
import OptimizeTableState from "@/components/gui/table-optimized/optimize-table-state";
import RowDetailDialog, {
  RowDetailField,
} from "@/components/gui/row-detail-dialog";
import { useStudioContext } from "@/context/driver-provider";
import { usePathname } from "next/navigation";
import { ColumnSortOption } from "@/drivers/base-driver";
import { exportDataAsDelimitedText } from "@/lib/export-helper";
import { KEY_BINDING } from "@/lib/key-matcher";
import { cn } from "@/lib/utils";
import {
  LucideChevronDown,
  LucidePin,
  LucidePinOff,
  LucideSortAsc,
  LucideSortDesc,
  LucideX,
} from "lucide-react";
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import useTableResultContextMenu from "./table-result/context-menu";
import tableResultCellRenderer from "./table-result/render-cell";
import { TableHeaderMetadata } from "./table-result/type";

interface ResultTableProps {
  data: OptimizeTableState<TableHeaderMetadata>;
  tableName?: string;
  onSortColumnChange?: (columns: ColumnSortOption[]) => void;
  sortColumns?: ColumnSortOption[];
  visibleColumnIndexList?: number[];
  onScrollToBottom?: () => void;
  // When provided (table browsing), per-column search runs SERVER-SIDE: the
  // parent turns each term into a WHERE ... LIKE and re-queries. Without it
  // (ad-hoc query results), column search falls back to a client-side filter of
  // the loaded rows.
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (column: string, term: string) => void;
}

/** Debounced per-column search box with a clear (×) button. */
function ColumnSearchInput({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: string;
  onCommit: (term: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Re-sync when the value is cleared/changed from outside (e.g. the chips bar).
  useEffect(() => setText(value), [value]);
  const commit = useCallback(
    (v: string, immediate = false) => {
      setText(v);
      if (timer.current) clearTimeout(timer.current);
      if (immediate) return onCommit(v);
      timer.current = setTimeout(() => onCommit(v), 350);
    },
    [onCommit]
  );
  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(text, true);
        }}
        placeholder={`Search ${name}…`}
        className="w-full rounded border border-neutral-300 bg-white py-1 pr-6 pl-2 text-sm outline-none focus:border-[#e0cf00] dark:border-neutral-700 dark:bg-neutral-950"
      />
      {text && (
        <button
          onClick={() => commit("", true)}
          title="Clear"
          className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          <LucideX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Header({
  children,
  header,
  internalState,
}: PropsWithChildren<{
  header: OptimizeTableHeaderWithIndexProps;
  internalState: OptimizeTableState;
}>) {
  const [open, setOpen] = useState(false);
  const colIndex = header.index;

  let textClass = "grow line-clamp-1 font-mono font-bold";
  let thClass = "flex grow items-center px-2 overflow-hidden";

  if (internalState.getSelectedColIndex().includes(colIndex)) {
    if (internalState.isFullSelectionCol(colIndex)) {
      textClass =
        "grow line-clamp-1 font-mono font-bold text-black dark:text-white font-bold";
      thClass =
        "flex grow items-center px-2 overflow-hidden bg-neutral-100 dark:bg-neutral-900";
    } else {
      textClass =
        "grow line-clamp-1 font-mono font-bold dark:text-white font-bold";
      thClass =
        "flex grow items-center px-2 overflow-hidden bg-neutral-100 dark:bg-neutral-900";
    }
  }

  return (
    <div className={thClass}>
      <div
        className={thClass}
        onMouseDown={(e) => {
          if (e.button === 2) {
            setOpen(true);
            e.preventDefault();
          } else {
            const focusCell = internalState.getFocus();
            if (e.shiftKey && focusCell) {
              internalState.selectColRange(focusCell.x, colIndex);
            } else if (e.ctrlKey && focusCell) {
              internalState.addSelectionCol(colIndex);
              internalState.setFocus(0, colIndex);
            } else {
              internalState.selectColumn(colIndex);
              internalState.setFocus(0, colIndex);
            }
          }
        }}
      >
        {header.display.icon ? (
          <div className="mr-2">
            <header.display.icon
              className={cn("h-4 w-4", header.display.iconClassName)}
            />
          </div>
        ) : null}
        <div className={textClass}>{header.display.text}</div>
      </div>
      <div>
        <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
          <DropdownMenuTrigger asChild>
            <LucideChevronDown
              className={cn(
                "text-mute h-4 w-4 shrink-0 cursor-pointer",
                textClass
              )}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={"w-[300px]"}
            side="bottom"
            align="start"
            sideOffset={0}
          >
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function ResultTable({
  data,
  tableName,
  onSortColumnChange,
  visibleColumnIndexList,
  onScrollToBottom,
  columnFilters,
  onColumnFilterChange,
}: ResultTableProps) {
  // Server mode: the parent runs the search as a DB WHERE and re-queries.
  const serverSearch = !!onColumnFilterChange;
  const [stickyHeaderIndex, setStickHeaderIndex] = useState<number>();
  const [detailFields, setDetailFields] = useState<RowDetailField[] | null>(
    null
  );
  // Stable identity of the row shown in the detail dialog (for comments).
  const [detailRowKey, setDetailRowKey] = useState<string | undefined>();

  const { extensions } = useStudioContext();

  // Connection id from the /vault/<id> route — lets row comments anchor to it.
  const pathname = usePathname();
  const connectionId = useMemo(() => {
    const m = pathname?.match(/\/vault\/([^/?#]+)/);
    return m?.[1];
  }, [pathname]);

  // Per-column client-side search (from each column's dropdown). When any term
  // is set, render a filtered, read-only copy showing only matching rows.
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});

  const displayData = useMemo(() => {
    // In server mode the DB already filtered, so never filter client-side.
    if (serverSearch) return data;
    const active = Object.entries(columnSearch).filter(([, v]) => v.trim());
    if (active.length === 0) return data;
    const headers = data.getHeaders();
    const rows = data
      .getAllRows()
      .filter((r) => {
        const raw = r.raw as Record<string, unknown>;
        return active.every(([col, term]) =>
          String(raw[col] ?? "")
            .toLowerCase()
            .includes(term.toLowerCase())
        );
      })
      .map((r) => ({ ...(r.raw as Record<string, unknown>) }));
    const st = new OptimizeTableState(headers, rows);
    st.setReadOnlyMode(true);
    return st;
  }, [data, columnSearch, serverSearch]);

  const headerIndex = useMemo(() => {
    if (visibleColumnIndexList) return visibleColumnIndexList;
    return displayData.getHeaders().map((_, idx) => idx);
  }, [displayData, visibleColumnIndexList]);

  const renderHeader = useCallback(
    (header: OptimizeTableHeaderWithIndexProps<TableHeaderMetadata>) => {
      const extensionMenu = extensions.getQueryHeaderContextMenu(header, displayData);
      const extensionMenuItems = extensionMenu.map((item) => {
        if (item.component) {
          return (
            <div
              key={item.key}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              {item.component}
            </div>
          );
        }

        return (
          <DropdownMenuItem key={item.key} onClick={item.onClick}>
            {item.title}
          </DropdownMenuItem>
        );
      });

      const handleOnPinColumnClick = () => {
        setStickHeaderIndex(
          header.index === stickyHeaderIndex ? undefined : header.index
        );
      };

      return (
        <Header key={header.name} header={header} internalState={displayData}>
          <div
            className="p-1"
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ColumnSearchInput
              name={header.name}
              value={
                serverSearch
                  ? columnFilters?.[header.name] ?? ""
                  : columnSearch[header.name] ?? ""
              }
              onCommit={(term) => {
                if (serverSearch) onColumnFilterChange!(header.name, term);
                else setColumnSearch((s) => ({ ...s, [header.name]: term }));
              }}
            />
          </div>
          <DropdownMenuSeparator />
          {extensionMenuItems}
          <DropdownMenuItem onClick={handleOnPinColumnClick}>
            {header.sticky ? (
              <LucidePinOff className="mr-2 h-4 w-4" />
            ) : (
              <LucidePin className="mr-2 h-4 w-4" />
            )}
            {header.sticky ? "Unpin Header" : "Pin Header"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!tableName}
            onClick={() => {
              if (onSortColumnChange) {
                onSortColumnChange([{ columnName: header.name, by: "ASC" }]);
              }
            }}
          >
            <LucideSortAsc className="mr-2 h-4 w-4" />
            Sort A → Z
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!tableName}
            onClick={() => {
              if (onSortColumnChange) {
                onSortColumnChange([{ columnName: header.name, by: "DESC" }]);
              }
            }}
          >
            <LucideSortDesc className="mr-2 h-4 w-4" />
            Sort Z → A
          </DropdownMenuItem>
        </Header>
      );
    },
    [displayData, tableName, stickyHeaderIndex, onSortColumnChange, extensions, columnSearch, serverSearch, columnFilters, onColumnFilterChange]
  );

  const onHeaderContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const copyCallback = useCallback(
    (state: OptimizeTableState) => {
      const focus = state.getFocus();
      if (focus) {
        const y = focus.y;
        const x = focus.x;
        const selectedRange = state.getSelectionRange(y, x);
        if (
          selectedRange &&
          (selectedRange.x1 !== selectedRange.x2 ||
            selectedRange.y1 !== selectedRange.y2)
        ) {
          const headers = data
            .getHeaders()
            .filter(
              (_, index) =>
                index >= selectedRange.x1 && index <= selectedRange.x2
            )
            .map((header) => header.name);
          const records = data
            .getAllRows()
            .filter(
              (_, index) =>
                index >= selectedRange.y1 && index <= selectedRange.y2
            )
            .map((row) => headers.map((header) => row.raw[header]));
          exportDataAsDelimitedText(
            [],
            records,
            "\t",
            "\r\n",
            '"',
            "clipboard"
          );
        } else {
          window.navigator.clipboard.writeText(state.getValue(y, x) as string);
        }
      }
    },
    [data]
  );

  const pasteCallback = useCallback((state: OptimizeTableState) => {
    const focus = state.getFocus();
    if (focus) {
      const y = focus.y;
      const x = focus.x;
      window.navigator.clipboard.readText().then((pasteValue) => {
        const data = pasteValue.split("\r\n").map((row) => row.split("\t"));

        for (let row = 0; row < data.length; row++) {
          //filter out the additional enter from excel copy
          if (row === data.length - 1) {
            if (data[row].length === 1 && data[row][0] === "") {
              break;
            }
          }
          for (let col = 0; col < data[row].length; col++) {
            state.changeValue(
              y + row,
              x + col,
              data[row][col].toLowerCase() === "null" ? null : data[row][col]
            );
          }
        }
      });
    }
  }, []);

  const onCellContextMenu = useTableResultContextMenu({
    tableName,
    data,
    copyCallback,
    pasteCallback,
  });

  const onShiftKeyDownCallBack = useCallback(
    (state: OptimizeTableState, e: React.KeyboardEvent) => {
      const focus = state.getFocus();
      if (e.shiftKey && focus) {
        let lastMove = null;
        if (state.getLastMove()) {
          lastMove = state.getLastMove();
        } else {
          const selectedRange = state.getSelectionRange(focus.y, focus.x);
          if (selectedRange)
            lastMove = { x: selectedRange.x2, y: selectedRange.y2 };
        }

        if (lastMove) {
          const rows = state.getRowsCount();
          const cols = state.getHeaderCount();
          let newRow = lastMove.y;
          let newCol = lastMove.x;
          let horizontal: "right" | "left" = "left";
          let vertical: "top" | "bottom" = "bottom";
          if (e.key === "ArrowUp") {
            newRow = Math.max(lastMove.y - 1, 0);
            horizontal = "left";
            vertical = "top";
          }
          if (e.key === "ArrowDown") {
            horizontal = "left";
            vertical = "bottom";
            newRow = Math.min(lastMove.y + 1, rows - 1);
          }
          if (e.key === "ArrowLeft") {
            horizontal = "left";
            vertical = "top";
            newCol = Math.max(lastMove.x - 1, 0);
          }
          if (e.key === "ArrowRight") {
            horizontal = "right";
            vertical = "top";
            newCol = Math.min(lastMove.x + 1, cols - 1);
          }

          state.selectCellRange(focus.y, focus.x, newRow, newCol);
          state.setLastMove(newRow, newCol);
          state.scrollToCell(horizontal, vertical, { x: newCol, y: newRow });
        }
      }
    },
    []
  );

  const onKeyDown = useCallback(
    (state: OptimizeTableState, e: React.KeyboardEvent) => {
      if (state.isInEditMode()) return;

      if (KEY_BINDING.copy.match(e as React.KeyboardEvent<HTMLDivElement>)) {
        copyCallback(state);
      } else if (
        KEY_BINDING.paste.match(e as React.KeyboardEvent<HTMLDivElement>)
      ) {
        pasteCallback(state);
      } else if (e.key === "ArrowRight") {
        if (e.shiftKey) {
          onShiftKeyDownCallBack(state, e);
        } else {
          const focus = state.getFocus();
          if (focus && focus.x + 1 < state.getHeaderCount()) {
            state.setFocus(focus.y, focus.x + 1);
            state.scrollToCell("right", "top", { y: focus.y, x: focus.x + 1 });
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (e.shiftKey) {
          onShiftKeyDownCallBack(state, e);
        } else {
          const focus = state.getFocus();
          if (focus && focus.x - 1 >= 0) {
            state.setFocus(focus.y, focus.x - 1);
            state.scrollToCell("left", "top", { y: focus.y, x: focus.x - 1 });
          }
        }
      } else if (e.key === "ArrowUp") {
        if (e.shiftKey) {
          onShiftKeyDownCallBack(state, e);
        } else {
          const focus = state.getFocus();
          if (focus && focus.y - 1 >= 0) {
            state.setFocus(focus.y - 1, focus.x);
            state.scrollToCell("left", "top", { y: focus.y - 1, x: focus.x });
          }
        }
      } else if (e.key === "ArrowDown") {
        if (e.shiftKey) {
          onShiftKeyDownCallBack(state, e);
        } else {
          const focus = state.getFocus();
          if (focus && focus.y + 1 < state.getRowsCount()) {
            state.setFocus(focus.y + 1, focus.x);
            state.scrollToCell("left", "bottom", {
              y: focus.y + 1,
              x: focus.x,
            });
          }
        }
      } else if (e.key === "Tab") {
        const focus = state.getFocus();
        if (focus) {
          const colCount = state.getHeaderCount();
          const n = focus.y * colCount + focus.x + 1;
          const x = n % colCount;
          const y = Math.floor(n / colCount);
          if (y >= state.getRowsCount()) return;
          state.setFocus(y, x);
          state.scrollToCell(x === 0 ? "left" : "right", "bottom", {
            y: y,
            x: x,
          });
        }
      } else if (e.key === "Enter") {
        state.enterEditMode();
      } else if (e.code === "Space") {
        // Row detail: show every column of the focused row (DBeaver-style).
        const focus = state.getFocus();
        if (focus) {
          const headers = state.getHeaders();
          setDetailFields(
            headers.map((h, i) => ({
              name: h.name,
              value: state.getValue(focus.y, i),
            }))
          );
          // Build a stable row key from the primary-key columns (metadata.n),
          // falling back to all columns when the table has no PK.
          const pk = headers
            .map((h, i) => ({ h, i }))
            .filter(
              ({ h }) =>
                (h.metadata as { isPrimaryKey?: boolean } | undefined)?.isPrimaryKey
            );
          const cols = pk.length ? pk : headers.map((h, i) => ({ h, i }));
          setDetailRowKey(
            cols
              .map(({ h, i }) => `${h.name}=${String(state.getValue(focus.y, i) ?? "")}`)
              .join("|")
          );
        }
      }

      e.preventDefault();
    },
    [copyCallback, onShiftKeyDownCallBack, pasteCallback]
  );

  return (
    <>
      <OptimizeTable
        internalState={displayData}
        onContextMenu={onCellContextMenu}
        onHeaderContextMenu={onHeaderContextMenu}
        stickyHeaderIndex={stickyHeaderIndex}
        arrangeHeaderIndex={headerIndex}
        renderAhead={20}
        renderHeader={renderHeader}
        rowHeight={35}
        onKeyDown={onKeyDown}
        renderCell={tableResultCellRenderer}
        onScrollToBottom={onScrollToBottom}
      />
      <RowDetailDialog
        fields={detailFields}
        onClose={() => setDetailFields(null)}
        connectionId={connectionId}
        tableName={tableName}
        rowKey={detailRowKey}
      />
    </>
  );
}

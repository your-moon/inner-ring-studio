import Kbd from "@/components/ui/kbd";
import { convertDatabaseValueToString } from "@/drivers/sqlite/sql-helper";
import { ColumnType } from "@outerbase/sdk-transform";
import { X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type OptimizeTableState from "./table-optimized/optimize-table-state";
import type { TableHeaderMetadata } from "./table-result/type";

/**
 * The record inspector (Linear peek / Attio record pattern): the focused grid
 * row rendered as a readable record beside the grid — never over it. Mounted
 * as a ResizablePanel sibling of the grid, it live-follows the grid focus, so
 * ↑/↓ in the grid walks records while it is open; Esc closes it.
 */

interface Snapshot {
  /** Cheap identity of what we render; equal key = skip the re-render. */
  key: string;
  rowIndex: number | null;
}

function computeSnapshot(
  state: OptimizeTableState<TableHeaderMetadata>
): Snapshot {
  const focus = state.getFocus();
  // Only materialize the selection when there is no focus — selecting a column
  // on a 50k-row result builds a 50k-entry list we would otherwise throw away.
  const rawIndex =
    focus?.y ?? (state.getSelectedRowIndex().length
      ? state.getSelectedRowIndex()[0]
      : null);
  const rowsCount = state.getRowsCount();
  const rowIndex =
    rawIndex !== null && rawIndex < rowsCount ? rawIndex : null;

  if (rowIndex === null) return { key: "none", rowIndex: null };

  // Signature of the rendered row: its index, the number of dirty cells in it,
  // and the focused cell's value (edits land at the focus). Unrelated grid
  // broadcasts — drag-selection shapes, other rows changing — leave it stable,
  // so the inspector skips those re-renders entirely.
  const cols = state.getHeaderCount();
  let dirty = 0;
  for (let x = 0; x < cols; x++) if (state.hasCellChange(rowIndex, x)) dirty++;
  const focusVal =
    focus !== null ? String(state.getValue(focus.y, focus.x) ?? "") : "";
  return {
    key: `${rowIndex}|${rowsCount}|${dirty}|${focusVal.slice(0, 80)}`,
    rowIndex,
  };
}

/** Column type label from the driver metadata (best effort, may be absent). */
function typeLabel(metadata: TableHeaderMetadata): string | null {
  const raw = metadata.originalType ?? metadata.columnSchema?.type ?? null;
  return raw ? String(raw).toLowerCase() : null;
}

function isNumericType(metadata: TableHeaderMetadata, value: unknown) {
  return (
    typeof value === "number" ||
    typeof value === "bigint" ||
    metadata.type === ColumnType.INTEGER ||
    metadata.type === ColumnType.REAL
  );
}

export default function RowInspector({
  state,
  visibleColumnIndexList,
  onClose,
}: {
  state: OptimizeTableState<TableHeaderMetadata>;
  /** The grid's visible columns (saved views hide some) — mirror them. */
  visibleColumnIndexList?: number[];
  onClose: () => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    computeSnapshot(state)
  );
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const cb = () => {
      setSnapshot((prev) => {
        const next = computeSnapshot(state);
        return next.key === prev.key ? prev : next;
      });
    };
    cb();
    state.addChangeListener(cb);
    return () => state.removeChangeListener(cb);
  }, [state]);

  // Esc closes — unless a cell editor owns the key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.isInEditMode()) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  const { rowIndex } = snapshot;
  const headers = state.getHeaders();

  const visibleSet = useMemo(
    () =>
      visibleColumnIndexList ? new Set(visibleColumnIndexList) : undefined,
    [visibleColumnIndexList]
  );
  const hiddenCount = visibleSet
    ? headers.length - visibleSet.size
    : 0;

  // Record identity: primary-key value(s), like "42" — not a meaningless
  // viewport ordinal. Falls back to the row number when there is no PK.
  const identity = useMemo(() => {
    if (rowIndex === null) return null;
    const pks = headers
      .map((h, x) => ({ h, x }))
      .filter(({ h }) => h.metadata.isPrimaryKey);
    if (pks.length === 0) return `Row ${rowIndex + 1}`;
    return pks
      .map(({ x }) => convertDatabaseValueToString(state.getValue(rowIndex, x)))
      .join(" · ");
    // snapshot.key covers the value dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIndex, headers, state, snapshot.key]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <span className="truncate text-[13px] font-medium text-foreground">
          {rowIndex === null ? "No row selected" : identity}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Kbd>Esc</Kbd>
          <button
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close inspector"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {rowIndex === null ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
          Click any cell to inspect its row.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {headers.map((h, x) => {
            if (visibleSet && !visibleSet.has(x) && !showHidden) return null;
            const value = state.getValue(rowIndex, x);
            const changed = state.hasCellChange(rowIndex, x);
            const type = typeLabel(h.metadata);
            const numeric = isNumericType(h.metadata, value);
            return (
              <div key={h.name} className="py-2">
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] text-muted-foreground">
                    {h.display?.text ?? h.name}
                  </span>
                  {type && (
                    <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground/70">
                      {type}
                    </span>
                  )}
                </div>
                <div
                  className={
                    "text-[13px] break-words whitespace-pre-wrap " +
                    (changed
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground") +
                    (numeric ? " font-mono tabular-nums text-[12.5px]" : "")
                  }
                >
                  {value === null || value === undefined ? (
                    <span className="text-muted-foreground/60 italic">
                      NULL
                    </span>
                  ) : (
                    convertDatabaseValueToString(value)
                  )}
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="mt-1 mb-2 w-full rounded-md py-1.5 text-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {showHidden
                ? "Hide fields not in this view"
                : `Show ${hiddenCount} hidden ${hiddenCount === 1 ? "field" : "fields"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

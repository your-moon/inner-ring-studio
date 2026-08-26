import {
  Button,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  IconButton,
  Kbd,
} from "@/components/orbit";
import { convertDatabaseValueToString } from "@/drivers/sqlite/sql-helper";
import { cn } from "@/lib/utils";
import { ColumnType } from "@outerbase/sdk-transform";
import { X } from "lucide-react";
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
    <div className="bg-surface-panel animate-in duration-200 fade-in-0 slide-in-from-right-2 flex h-full flex-col">
      <div className="border-border-subtle flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="text-ui-default [color:var(--content-primary)] truncate font-[var(--weight-medium)]">
          {rowIndex === null ? "No row selected" : identity}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Kbd>Esc</Kbd>
          <IconButton aria-label="Close inspector" size="sm" onClick={onClose}>
            <X />
          </IconButton>
        </div>
      </div>

      {rowIndex === null ? (
        <EmptyState className="flex-1">
          Click any cell to inspect its row.
        </EmptyState>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
          <DescriptionList>
            {headers.map((h, x) => {
              if (visibleSet && !visibleSet.has(x) && !showHidden) return null;
              const value = state.getValue(rowIndex, x);
              const changed = state.hasCellChange(rowIndex, x);
              const type = typeLabel(h.metadata);
              const numeric = isNumericType(h.metadata, value);
              const isNull = value === null || value === undefined;
              return (
                <DescriptionItem
                  key={h.name}
                  term={
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate">{h.display?.text ?? h.name}</span>
                      {type ? (
                        <span className="[color:var(--content-disabled)] shrink-0 font-mono text-[10.5px]">
                          {type}
                        </span>
                      ) : null}
                    </span>
                  }
                >
                  <span
                    className={cn(
                      "break-words whitespace-pre-wrap",
                      changed && "[color:var(--intent-warning)]",
                      numeric && "text-ui-small font-mono [font-variant-numeric:tabular-nums]"
                    )}
                  >
                    {isNull ? (
                      <span className="[color:var(--content-tertiary)] italic">
                        NULL
                      </span>
                    ) : (
                      convertDatabaseValueToString(value)
                    )}
                  </span>
                </DescriptionItem>
              );
            })}
          </DescriptionList>
          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="my-2 w-full justify-center"
              onClick={() => setShowHidden((v) => !v)}
              title={
                showHidden
                  ? "Hide fields not in this view"
                  : `Show ${hiddenCount} hidden ${hiddenCount === 1 ? "field" : "fields"}`
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

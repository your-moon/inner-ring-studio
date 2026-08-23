import { X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type OptimizeTableState from "./table-optimized/optimize-table-state";

/**
 * A right-side record inspector (Attio/Postico pattern): the focused grid row
 * rendered as a readable form — one field per column with its type annotation —
 * so wide tables don't force endless horizontal scrolling. Reads live from the
 * grid's own OptimizeTableState and re-renders as the focus/selection moves.
 */
export default function RowInspector({
  state,
  onClose,
}: {
  state: OptimizeTableState;
  onClose: () => void;
}) {
  // The grid state mutates in place and broadcasts; bump a tick to re-read it.
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    state.addChangeListener(cb);
    return () => state.removeChangeListener(cb);
  }, [state]);

  const focus = state.getFocus();
  const selected = state.getSelectedRowIndex();
  const rowIndex = focus?.y ?? (selected.length ? selected[0] : null);
  const headers = state.getHeaders();

  return (
    <div className="absolute top-0 right-0 bottom-0 z-10 flex w-[340px] flex-col border-l border-border bg-background shadow-[0_0_24px_rgba(0,0,0,0.06)]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[13px] font-semibold text-foreground">
          {rowIndex === null ? "No row selected" : `Row ${rowIndex + 1}`}
        </span>
        <button
          onClick={onClose}
          className="press grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      {rowIndex === null ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
          Click any cell to inspect its row.
        </div>
      ) : (
        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {headers.map((h, x) => {
            const value = state.getValue(rowIndex, x);
            const changed = state.hasCellChange(rowIndex, x);
            const type = headerType(h.metadata);
            return (
              <div key={h.name} className="px-3 py-2">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-[12px] text-foreground">
                    {h.display?.text ?? h.name}
                  </span>
                  {type && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {type}
                    </span>
                  )}
                </div>
                <div
                  className={
                    "font-mono text-[12.5px] break-words whitespace-pre-wrap " +
                    (changed ? "text-primary" : "text-foreground/90")
                  }
                >
                  {value === null || value === undefined ? (
                    <span className="text-muted-foreground/70 italic">NULL</span>
                  ) : typeof value === "object" ? (
                    JSON.stringify(value)
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Best-effort column type label from the header's driver metadata. */
function headerType(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const t = m.type as Record<string, unknown> | undefined;
  const raw =
    (t?.type as string) ??
    (m.originalType as string) ??
    (m.columnType as string) ??
    null;
  return raw ? String(raw).toLowerCase() : null;
}

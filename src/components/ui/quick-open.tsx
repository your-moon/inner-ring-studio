"use client";

import { fuzzyRank } from "@/components/ui/fuzzy-rank";
import { cn } from "@/lib/utils";
import { LucideSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export { fuzzyRank, fuzzyScore } from "@/components/ui/fuzzy-rank";

export interface QuickOpenProps<T> {
  open: boolean;
  onClose: () => void;
  items: T[];
  getKey: (item: T) => string;
  getSearchText: (item: T) => string;
  onPick: (item: T) => void;
  /** Draw one row; `active` is the currently highlighted row. The row's own
   *  padding, hover, and active styling live here, so each palette keeps its
   *  look. Interactive controls inside should `stopPropagation`. */
  renderRow: (item: T, opts: { active: boolean }) => ReactNode;
  placeholder?: string;
  /** Cap the visible list. Defaults to 50; pass a larger value (or omit via a
   *  big number) when the source is already bounded. */
  limit?: number;
  /** Extra classes for the panel (e.g. a wider `max-w-2xl`). */
  panelClassName?: string;
  footer?: ReactNode;
  /** Rendered when the visible list is empty. `hasQuery` separates
   *  "nothing typed / no data" from "typed, no matches". */
  renderEmpty?: (info: { hasQuery: boolean; itemCount: number }) => ReactNode;
}

/**
 * A quick-open palette: overlay + search input + fuzzy filtering + keyboard
 * navigation (↑↓ / Enter / Esc) + backdrop close + scroll-into-view. The caller
 * owns the item type, how a row is drawn, and what picking does — so both the
 * ⌘K command palette and the query-history palette are thin adapters over it.
 */
export function QuickOpen<T>({
  open,
  onClose,
  items,
  getKey,
  getSearchText,
  onPick,
  renderRow,
  placeholder = "Search…",
  limit = 50,
  panelClassName,
  footer,
  renderEmpty,
}: QuickOpenProps<T>) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => fuzzyRank(items, getSearchText, query, limit),
    [items, getSearchText, query, limit]
  );

  // Reset and focus the input each time it opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view as you arrow through the list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-qo-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const pick = (item: T) => {
    onPick(item);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        // Esc closes even when focus has left the input (e.g. after a mouse move).
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900",
          panelClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-3 dark:border-neutral-800">
          <LucideSearch size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = results[active];
                if (item) pick(item);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder={placeholder}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-neutral-700">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {results.length === 0 &&
            (renderEmpty ? (
              renderEmpty({
                hasQuery: query.trim().length > 0,
                itemCount: items.length,
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-neutral-400">
                No matches.
              </div>
            ))}
          {results.map((item, i) => (
            <div
              key={getKey(item)}
              data-qo-idx={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(item)}
            >
              {renderRow(item, { active: i === active })}
            </div>
          ))}
        </div>

        {footer}
      </div>
    </div>
  );
}

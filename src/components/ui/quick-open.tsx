"use client";

import { fuzzyRank } from "@/components/ui/fuzzy-rank";
import { overlayVariants, popVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { LucideSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

  if (typeof document === "undefined") return null;

  const pick = (item: T) => {
    onPick(item);
    onClose();
  };

  // Portal to <body>: the palette is often mounted deep in a tab/panel subtree
  // whose transforms + z-indexed layers would otherwise trap this fixed overlay
  // (the editor and result grid would paint over it). At the body root it always
  // covers the whole window. AnimatePresence lets the close animate before unmount.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="qo-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          // zIndex + top padding as inline styles, not Tailwind arbitrary classes:
          // they must always apply (a positioned z-50 tab strip was painting over
          // the palette, and the panel sat flush to the top).
          style={{ zIndex: 1000, paddingTop: "12vh" }}
          className="fixed inset-0 flex items-start justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          onKeyDown={(e) => {
            // Esc closes even when focus has left the input (e.g. after a mouse move).
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <motion.div
            variants={popVariants}
            style={{
              transformOrigin: "top center",
              // Linear's exact 5-layer command-menu shadow — barely-there depth.
              boxShadow:
                "0 4px 40px #0000001a, 0 3px 20px #00000020, 0 3px 12px #00000020, 0 2px 8px #00000020, 0 1px 1px #00000020",
            }}
            className={cn(
              "flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-popover",
              panelClassName
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-border px-3.5">
              <LucideSearch size={16} className="text-muted-foreground" />
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
                className="w-full bg-transparent py-3.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
              {results.length === 0 &&
                (renderEmpty ? (
                  renderEmpty({
                    hasQuery: query.trim().length > 0,
                    itemCount: items.length,
                  })
                ) : (
                  <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

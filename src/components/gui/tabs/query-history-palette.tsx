import { QuickOpen } from "@/components/ui/quick-open";
import { deleteHistory, getHistory } from "@/lib/query-history";
import { LucideClock, LucideX } from "lucide-react";
import { useEffect, useState } from "react";

interface QueryHistoryPaletteProps {
  open: boolean;
  onClose: () => void;
  scope: string;
  onPick: (sql: string) => void;
}

// Compact "2h ago" / "yesterday" style timestamp.
function ago(ms: number, now: number): string {
  const s = Math.floor((now - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/**
 * Query-history quick-open: the per-connection frecency-ranked list of past
 * queries, as a thin adapter over the shared QuickOpen. This module owns only
 * the history data (load/delete) and its row look (preview, ×N, timestamp, ✕).
 */
export default function QueryHistoryPalette({
  open,
  onClose,
  scope,
  onPick,
}: QueryHistoryPaletteProps) {
  const [entries, setEntries] = useState<ReturnType<typeof getHistory>>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (open) {
      setEntries(getHistory(scope));
      setNow(Date.now());
    }
  }, [open, scope]);

  const remove = (sql: string) => {
    deleteHistory(scope, sql);
    setEntries(getHistory(scope));
  };

  return (
    <QuickOpen
      open={open}
      onClose={onClose}
      items={entries}
      limit={100}
      panelClassName="max-w-2xl"
      placeholder="Search your past queries…"
      getKey={(h) => h.sql}
      getSearchText={(h) => h.sql}
      onPick={(h) => onPick(h.sql)}
      renderRow={(h, { active }) => (
        <div
          className={
            "group flex cursor-pointer items-start gap-3 px-3 py-2.5 " +
            (active
              ? "bg-secondary"
              : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")
          }
        >
          <pre className="line-clamp-2 flex-1 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
            {h.sql}
          </pre>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {h.count > 1 && (
              <span className="rounded bg-neutral-200 px-1.5 text-[10px] text-muted-foreground dark:bg-neutral-700 dark:text-neutral-300">
                ×{h.count}
              </span>
            )}
            <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
              <LucideClock size={11} />
              {ago(h.at, now)}
            </span>
            <button
              title="Remove from history"
              onClick={(e) => {
                e.stopPropagation();
                remove(h.sql);
              }}
              className="rounded p-0.5 text-neutral-300 opacity-0 hover:bg-neutral-200 hover:text-secondary-foreground group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <LucideX size={13} />
            </button>
          </div>
        </div>
      )}
      renderEmpty={({ hasQuery }) => (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {hasQuery
            ? "No matches."
            : "No queries yet — run one and it'll show up here."}
        </div>
      )}
      footer={
        <div className="flex items-center gap-4 border-t border-neutral-100 px-3 py-2 text-[10px] text-muted-foreground dark:border-neutral-800">
          <span>
            <kbd className="font-sans">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-sans">↵</kbd> load into editor
          </span>
          <span className="ml-auto">
            ranked by how often &amp; recently you run them
          </span>
        </div>
      }
    />
  );
}

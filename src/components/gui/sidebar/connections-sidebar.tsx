"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import ConnectionTreeItem from "@/app/(main)/connection-tree-item";
import type { NavConnection } from "@/app/(main)/nav-connection-item";
import { Skeleton } from "@/components/orbit";
import { scopedStore } from "@/lib/scoped-store";
import { cn } from "@/lib/utils";

const foldersCollapsedStore = scopedStore<string[]>(
  "studioFoldersCollapsed",
  []
);

/**
 * The studio workspace sidebar: every saved connection grouped by folder, each
 * one an expandable DBeaver-style tree (connection → schemas → tables/views).
 * This is the primary navigator on the /vault studio page — browse and switch
 * across all connections without leaving the workspace.
 */
export default function ConnectionsSidebar() {
  const { data, mutate } = useSWR<{ connections: NavConnection[] }>(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 5000 }
  );

  // `data` is undefined only until the first response lands (SWR keeps the
  // last good value across the 5s refresh, so this never flips back to
  // loading afterwards) -- distinct from an actually-empty vault, which is
  // `data.connections` resolving to a real empty array.
  const loading = !data;
  const conns = data?.connections ?? [];
  const folders = new Map<string, NavConnection[]>();
  for (const c of conns) {
    const k = c.folder?.trim() || "";
    if (!folders.has(k)) folders.set(k, []);
    folders.get(k)!.push(c);
  }
  const keys = [...folders.keys()].sort((a, b) =>
    a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)
  );

  // Collapsible folder groups, persisted so the studio remembers what you closed.
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(foldersCollapsedStore.read())
  );
  const toggleFolder = useCallback((f: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, []);
  // Persist outside the updater (updaters must stay pure — StrictMode
  // double-invokes them).
  useEffect(() => {
    foldersCollapsedStore.write([...collapsedFolders]);
  }, [collapsedFolders]);

  // Per-connection "action in flight" state → spinner in the tree node.
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const mark = useCallback((id: string, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const onAction = useCallback(
    async (id: string, action: "test" | "disconnect") => {
      if (action === "test") mark(id, true);
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, action }),
      })
        .then((r) => r.json())
        .catch(() => {});
      mark(id, false);
      mutate();
    },
    [mutate, mark]
  );

  const onDelete = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Delete connection "${name}"? Removes it from the vault.`))
        return;
      // Reuse the same busy-tracking the tree node's status dot already
      // renders a spinner for (see ConnectionTreeItem's `statusDot`) --
      // otherwise the row gives zero feedback between the confirm and the
      // list re-fetching.
      mark(id, true);
      await fetch(`/api/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});
      mark(id, false);
      mutate();
    },
    [mutate, mark]
  );

  const onOpen = useCallback(
    (id: string) => {
      mark(id, true);
      window.setTimeout(() => mark(id, false), 8000);
    },
    [mark]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto py-4">
      <h1 className="mb-3 px-4 text-[15px] font-semibold text-foreground">
        Databases
      </h1>
      {loading && (
        <div className="flex flex-col gap-2.5 px-4 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded" />
              <Skeleton className="h-4" style={{ width: `${75 - i * 8}%` }} />
            </div>
          ))}
        </div>
      )}
      {!loading && conns.length === 0 && (
        <p className="px-4 text-sm text-muted-foreground">No connections.</p>
      )}
      {keys.map((folder) => {
        const list = folders.get(folder)!;
        const isCollapsed = !!folder && collapsedFolders.has(folder);
        return (
          <div key={folder || "_"} className="mb-1">
            {folder && (
              <button
                onClick={() => toggleFolder(folder)}
                className="group u-smooth flex w-full items-center gap-1 px-3 pt-2 pb-1 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronRight size={10} className="shrink-0" />
                ) : (
                  <ChevronDown size={10} className="shrink-0" />
                )}
                <span className="flex-1 truncate">{folder}</span>
                <span className="font-normal text-muted-foreground/60 tabular-nums">
                  {list.length}
                </span>
              </button>
            )}
            {/* Hidden, not unmounted: collapsing must not throw away each
                item's expanded tree + fetched schema state. */}
            <div className={cn(isCollapsed && "hidden")}>
              {list.map((c) => (
                <ConnectionTreeItem
                  key={c.id}
                  conn={c}
                  busy={busy.has(c.id)}
                  onAction={onAction}
                  onDelete={onDelete}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

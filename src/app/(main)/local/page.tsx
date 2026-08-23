"use client";

import {
  CaretRight,
  Database,
  Plus,
  Table as TableIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getHistory } from "@/lib/query-history";
import { frecencyScores } from "@/lib/table-frecency";
import NavigationLayout from "../nav-layout";

interface Conn {
  id: string;
  name: string;
  driver: string;
  folder?: string;
  readOnly?: boolean;
  status?: { connected: boolean };
}
interface Board {
  id: string;
  name: string;
}
type RecentQuery = {
  sql: string;
  connId: string;
  connName: string;
  at: number;
};
type RecentTable = { table: string; connId: string; connName: string };

// Per-engine identity — a small colored mark so a connection reads at a glance.
const DRIVER: Record<string, { label: string; tile: string }> = {
  postgres: { label: "PostgreSQL", tile: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400" },
  mysql: { label: "MySQL", tile: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400" },
  clickhouse: { label: "ClickHouse", tile: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" },
};
const driverInfo = (d: string) =>
  DRIVER[d] ?? { label: d, tile: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.round(d / 7)}w ago`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold tracking-[0.06em] text-neutral-400 uppercase">
      {children}
    </h2>
  );
}

export default function HomePage() {
  const { data, isLoading } = useSWR<{ connections: Conn[] }>(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 5000 }
  );
  // Boards only resolve in cloud/linked mode; a 404 leaves this empty.
  const { data: boardData } = useSWR<{ boards?: Board[] }>(
    "/api/boards",
    (u: string) => fetch(u).then((r) => (r.ok ? r.json() : { boards: [] }))
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);
  const boards = boardData?.boards ?? [];
  const connKey = connections.map((c) => c.id).join(",");

  // Recents live in per-connection localStorage (the same stores the studio
  // writes). Read them client-side once the connection list is known.
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [recentTables, setRecentTables] = useState<RecentTable[]>([]);
  useEffect(() => {
    if (!connections.length) return;
    const rq: RecentQuery[] = [];
    const rt: { table: string; connId: string; connName: string; score: number }[] = [];
    for (const c of connections) {
      const scope = `/vault/${c.id}`;
      for (const h of getHistory(scope).slice(0, 6)) {
        rq.push({ sql: h.sql, connId: c.id, connName: c.name, at: h.at });
      }
      for (const [table, score] of Object.entries(frecencyScores(scope))) {
        rt.push({ table, connId: c.id, connName: c.name, score });
      }
    }
    setRecentQueries(rq.sort((a, b) => b.at - a.at).slice(0, 6));
    setRecentTables(
      rt.sort((a, b) => b.score - a.score).slice(0, 14).map(({ table, connId, connName }) => ({ table, connId, connName }))
    );
  }, [connKey, connections]);

  const hasRecents = recentQueries.length > 0 || recentTables.length > 0;

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-4xl px-8 py-10">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Pick up where you left off, or open a database to start querying.
            </p>
          </div>
          <Link
            href="/connections/new"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#f2df00]"
          >
            <Plus size={16} weight="bold" />
            New connection
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 py-24 text-center dark:border-neutral-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Database size={24} className="text-neutral-500" />
            </div>
            <div>
              <p className="font-medium">No databases connected yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                Connect a PostgreSQL, MySQL, or ClickHouse database to browse data
                and run SQL.
              </p>
            </div>
            <Link
              href="/connections/new"
              className="flex items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00]"
            >
              <Plus size={16} weight="bold" /> Connect a database
            </Link>
            <p className="text-xs text-neutral-400">
              Prefer the terminal? <code>pmsql conn add</code>
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Pick up where you left off — recent queries */}
            {recentQueries.length > 0 && (
              <section>
                <SectionLabel>Recent queries</SectionLabel>
                <div className="space-y-1.5">
                  {recentQueries.map((q, i) => (
                    <Link
                      key={`${q.connId}-${i}`}
                      href={`/vault/${q.connId}`}
                      className="group flex items-center gap-4 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
                    >
                      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-700 dark:text-neutral-300">
                        {q.sql}
                      </code>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {q.connName} · {timeAgo(q.at)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Tables you work in — dense, scannable */}
            {recentTables.length > 0 && (
              <section>
                <SectionLabel>Tables you work in</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {recentTables.map((t, i) => (
                    <Link
                      key={`${t.connId}-${t.table}-${i}`}
                      href={`/vault/${t.connId}`}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-neutral-200 py-1 pr-3 pl-2.5 text-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      <TableIcon size={13} className="text-neutral-400" />
                      <span className="truncate">{t.table}</span>
                      <span className="text-xs text-neutral-400">{t.connName}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Connections — a compact launcher, not a wall of cards */}
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <SectionLabel>
                  {hasRecents ? "All databases" : "Databases"}
                </SectionLabel>
                <span className="text-xs text-neutral-400">
                  {connections.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                {connections.map((c, i) => {
                  const info = driverInfo(c.driver);
                  return (
                    <Link
                      key={c.id}
                      href={`/vault/${c.id}`}
                      className={
                        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 " +
                        (i > 0
                          ? "border-t border-neutral-100 dark:border-neutral-800/70"
                          : "")
                      }
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${info.tile}`}
                      >
                        <Database size={16} weight="fill" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {c.name}
                          </span>
                          {c.readOnly && (
                            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-950/50 dark:text-amber-400">
                              RO
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                          <span>{info.label}</span>
                          {c.folder && (
                            <>
                              <span className="text-neutral-300 dark:text-neutral-700">·</span>
                              <span className="truncate">{c.folder}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        title={c.status?.connected ? "Connected" : "Idle"}
                        className={
                          "h-2 w-2 shrink-0 rounded-full " +
                          (c.status?.connected
                            ? "bg-green-500"
                            : "bg-neutral-200 dark:bg-neutral-700")
                        }
                      />
                      <CaretRight
                        size={15}
                        className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
                      />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Boards — only present in cloud/linked mode */}
            {boards.length > 0 && (
              <section>
                <SectionLabel>Boards</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {boards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      {b.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}

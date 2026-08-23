"use client";

import {
  ArrowRight,
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
type RecentQuery = { sql: string; connId: string; connName: string; at: number };
type RecentTable = { table: string; connId: string; connName: string };

const DRIVER_LABEL: Record<string, string> = {
  postgres: "Postgres",
  mysql: "MySQL",
  clickhouse: "ClickHouse",
};

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

function SectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useSWR<{ connections: Conn[] }>(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 5000 }
  );
  const { data: boardData } = useSWR<{ boards?: Board[] }>(
    "/api/boards",
    (u: string) => fetch(u).then((r) => (r.ok ? r.json() : { boards: [] }))
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);
  const boards = boardData?.boards ?? [];
  const connKey = connections.map((c) => c.id).join(",");

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
    setRecentQueries(rq.sort((a, b) => b.at - a.at).slice(0, 5));
    setRecentTables(
      rt.sort((a, b) => b.score - a.score).slice(0, 12).map(({ table, connId, connName }) => ({ table, connId, connName }))
    );
  }, [connKey, connections]);

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <header className="mb-9 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Home
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Jump back into your work, or open a database to start querying.
            </p>
          </div>
          <Link
            href="/connections/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            <Plus size={15} weight="bold" />
            New connection
          </Link>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <Database size={22} />
            </div>
            <p className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
              No databases connected
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-neutral-500">
              Connect a Postgres, MySQL, or ClickHouse database to browse data and
              run SQL.
            </p>
            <Link
              href="/connections/new"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
            >
              <Plus size={15} weight="bold" /> Connect a database
            </Link>
          </div>
        ) : (
          <div className="space-y-9">
            {/* Recent queries — a surfaced panel */}
            {recentQueries.length > 0 && (
              <section>
                <SectionHeading>Recent queries</SectionHeading>
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  {recentQueries.map((q, i) => (
                    <Link
                      key={`${q.connId}-${i}`}
                      href={`/vault/${q.connId}`}
                      className={
                        "group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 " +
                        (i > 0 ? "border-t border-neutral-100 dark:border-neutral-800/70" : "")
                      }
                    >
                      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-700 dark:text-neutral-300">
                        {q.sql}
                      </code>
                      <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {q.connName}
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px] text-neutral-400 tabular-nums">
                        {timeAgo(q.at)}
                      </span>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Tables you work in — crafted chips with soft depth */}
            {recentTables.length > 0 && (
              <section>
                <SectionHeading>Tables you work in</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {recentTables.map((t, i) => (
                    <Link
                      key={`${t.connId}-${t.table}-${i}`}
                      href={`/vault/${t.connId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 pr-3 pl-2.5 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                    >
                      <TableIcon size={13} className="text-neutral-400" />
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {t.table}
                      </span>
                      <span className="text-[11px] text-neutral-400">{t.connName}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Databases — a surfaced launcher */}
            <section>
              <SectionHeading
                aside={
                  <span className="text-[12px] text-neutral-400">
                    {connections.length}
                  </span>
                }
              >
                Databases
              </SectionHeading>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {connections.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/vault/${c.id}`}
                    className={
                      "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 " +
                      (i > 0 ? "border-t border-neutral-100 dark:border-neutral-800/70" : "")
                    }
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <Database size={17} weight="fill" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {c.name}
                        </span>
                        {c.readOnly && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-950/50 dark:text-amber-400">
                            RO
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[12px] text-neutral-400">
                        {DRIVER_LABEL[c.driver] ?? c.driver}
                        {c.folder ? ` · ${c.folder}` : ""}
                      </div>
                    </div>
                    <span
                      title={c.status?.connected ? "Connected" : "Idle"}
                      className={
                        "h-1.5 w-1.5 shrink-0 rounded-full " +
                        (c.status?.connected
                          ? "bg-emerald-500"
                          : "bg-neutral-200 dark:bg-neutral-700")
                      }
                    />
                    <ArrowRight
                      size={15}
                      className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {boards.length > 0 && (
              <section>
                <SectionHeading>Boards</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {boards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
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

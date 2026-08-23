"use client";

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
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
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

  const hasRecents = recentQueries.length > 0 || recentTables.length > 0;

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl px-10 py-14">
        <header className="mb-12 flex items-baseline justify-between">
          <h1 className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
            Home
          </h1>
          <Link
            href="/connections/new"
            className="text-[13px] text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            New connection
          </Link>
        </header>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="border-t border-neutral-200 py-20 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-900 dark:text-neutral-100">
              No databases connected
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-neutral-500">
              Connect a Postgres, MySQL, or ClickHouse database to browse data and
              run SQL.
            </p>
            <Link
              href="/connections/new"
              className="mt-5 inline-block text-[13px] font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 dark:text-neutral-100 dark:decoration-neutral-600"
            >
              Connect a database
            </Link>
          </div>
        ) : (
          <div className="space-y-11">
            {recentQueries.length > 0 && (
              <section>
                <h2 className="mb-3 text-[13px] text-neutral-400">Recent</h2>
                <ul className="-mx-3">
                  {recentQueries.map((q, i) => (
                    <li key={`${q.connId}-${i}`}>
                      <Link
                        href={`/vault/${q.connId}`}
                        className="group flex items-center gap-4 rounded px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-600 dark:text-neutral-300">
                          {q.sql}
                        </code>
                        <span className="shrink-0 font-mono text-[11px] text-neutral-400 tabular-nums">
                          {q.connName}
                        </span>
                        <span className="w-8 shrink-0 text-right text-[11px] text-neutral-300 tabular-nums dark:text-neutral-600">
                          {timeAgo(q.at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recentTables.length > 0 && (
              <section>
                <h2 className="mb-3 text-[13px] text-neutral-400">Tables</h2>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
                  {recentTables.map((t, i) => (
                    <Link
                      key={`${t.connId}-${t.table}-${i}`}
                      href={`/vault/${t.connId}`}
                      className="group text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                      <span className="font-mono">{t.table}</span>
                      <span className="ml-1.5 text-[11px] text-neutral-300 dark:text-neutral-600">
                        {t.connName}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-[13px] text-neutral-400">
                {hasRecents ? "Databases" : "Databases"}
              </h2>
              <ul className="border-t border-neutral-200 dark:border-neutral-800/80">
                {connections.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/vault/${c.id}`}
                      className="group flex items-center gap-3 border-b border-neutral-200 py-2.5 dark:border-neutral-800/80"
                    >
                      <span
                        title={c.status?.connected ? "Connected" : "Idle"}
                        className={
                          "h-1.5 w-1.5 shrink-0 rounded-full " +
                          (c.status?.connected
                            ? "bg-emerald-500"
                            : "bg-neutral-200 dark:bg-neutral-700")
                        }
                      />
                      <span className="text-[13px] text-neutral-900 group-hover:underline group-hover:decoration-neutral-300 group-hover:underline-offset-4 dark:text-neutral-100">
                        {c.name}
                      </span>
                      {c.readOnly && (
                        <span className="text-[11px] text-neutral-400">read-only</span>
                      )}
                      <span className="ml-auto text-[12px] text-neutral-400">
                        {DRIVER_LABEL[c.driver] ?? c.driver}
                        {c.folder ? (
                          <span className="text-neutral-300 dark:text-neutral-600">
                            {" · "}
                            {c.folder}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {boards.length > 0 && (
              <section>
                <h2 className="mb-3 text-[13px] text-neutral-400">Boards</h2>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
                  {boards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
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

"use client";

import { ArrowRight, Database, Plus, Table as TableIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { listContainer, listItem } from "@/lib/motion";
import EnvBadge from "@/components/orbit/env-badge";
import { bumpConnection, connectionLastOpened } from "@/lib/connection-frecency";
import { getHistory } from "@/lib/query-history";
import { frecencyScores } from "@/lib/table-frecency";
import NavigationLayout from "../nav-layout";

interface Conn {
  id: string;
  name: string;
  driver: string;
  folder?: string;
  readOnly?: boolean;
  environment?: string;
  host?: string;
  port?: number;
  database?: string;
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

// Deterministic identity color per connection name — a stable visual anchor
// for scanning the list (OKLCH keeps every hue equally bright).
function identityColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `oklch(0.65 0.14 ${h % 360})`;
}

// A quiet section label — small, medium-weight, muted. No uppercase shout.
function SectionLabel({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 className="text-xs font-semibold text-muted-foreground">{children}</h2>
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

  const [lastOpened, setLastOpened] = useState<Record<string, number>>({});
  useEffect(() => setLastOpened(connectionLastOpened()), []);

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
      rt
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ table, connId, connName }) => ({ table, connId, connName }))
    );
  }, [connKey, connections]);

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
              {(() => {
                const h = new Date().getHours();
                return h < 5
                  ? "Working late"
                  : h < 12
                    ? "Good morning"
                    : h < 18
                      ? "Good afternoon"
                      : "Good evening";
              })()}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Pick up where you left off, or open a database.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/connections/new">
              <Plus size={15} weight="bold" />
              New connection
            </Link>
          </Button>
        </header>

        {isLoading ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={
                  "h-14 animate-pulse bg-secondary/50 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-border px-8 py-16 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg border border-border text-muted-foreground">
              <Database size={22} />
            </div>
            <p className="text-[15px] font-medium text-foreground">
              No databases connected
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-muted-foreground">
              Connect a Postgres, MySQL, or ClickHouse database to browse data
              and run SQL.
            </p>
            <Button asChild size="sm" className="mt-6 gap-1.5">
              <Link href="/connections/new">
                <Plus size={15} weight="bold" /> Connect a database
              </Link>
            </Button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="space-y-10"
          >

            {/* Tables you work in — quiet hairline chips */}
            {recentTables.length > 0 && (
              <motion.section variants={listItem}>
                <SectionLabel>Continue</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {recentTables.map((t, i) => (
                    <Link
                      key={`${t.connId}-${t.table}-${i}`}
                      href={`/vault/${t.connId}`}
                      onClick={() => bumpConnection(t.connId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background py-1.5 pr-2.5 pl-2 text-[12.5px] transition-colors hover:bg-secondary"
                    >
                      <TableIcon size={12} className="text-muted-foreground" />
                      <span className="font-mono text-foreground/90">{t.table}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.connName}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Databases — the primary launcher */}
            <motion.section variants={listItem}>
              <SectionLabel
                aside={
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {connections.length}
                  </span>
                }
              >
                Databases
              </SectionLabel>
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                {connections.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/vault/${c.id}`}
                    onClick={() => bumpConnection(c.id)}
                    className={
                      "group grid h-11 grid-cols-[8px_minmax(140px,1.2fr)_max-content_max-content_minmax(0,1.6fr)_64px_8px] items-center gap-3 px-3.5 transition-colors hover:bg-secondary " +
                      (i > 0 ? "border-t border-border/60" : "")
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-[3px]"
                      style={{ background: identityColor(c.name) }}
                    />
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {c.name}
                      </span>
                      {c.readOnly && (
                        <span
                          title="Read-only: all writes blocked"
                          className="text-[10px] text-muted-foreground"
                        >
                          ⌀w
                        </span>
                      )}
                    </span>
                    <span className="rounded-[5px] border border-border px-1.5 py-px text-[11px] text-muted-foreground">
                      {DRIVER_LABEL[c.driver] ?? c.driver}
                    </span>
                    <EnvBadge environment={c.environment} />
                    <span className="truncate font-mono text-[11.5px] text-muted-foreground/80">
                      {c.host
                        ? `${c.host}${c.port ? `:${c.port}` : ""}${c.database ? `/${c.database}` : ""}`
                        : (c.folder ?? "")}
                    </span>
                    <span className="text-right text-[12px] text-muted-foreground tabular-nums">
                      {lastOpened[c.id] ? timeAgo(lastOpened[c.id]) : ""}
                    </span>
                    <span
                      title={c.status?.connected ? "Connected" : "Idle"}
                      className={
                        "h-1.5 w-1.5 justify-self-end rounded-full " +
                        (c.status?.connected ? "bg-emerald-500" : "bg-border")
                      }
                    />
                  </Link>
                ))}
              </div>
            </motion.section>

            {/* Recent queries — flat, hairline-divided rows */}
            {recentQueries.length > 0 && (
              <motion.section variants={listItem}>
                <SectionLabel>Recent queries</SectionLabel>
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  {recentQueries.map((q, i) => (
                    <Link
                      key={`${q.connId}-${i}`}
                      href={`/vault/${q.connId}`}
                      className={
                        "group flex items-center gap-4 px-3.5 py-2.5 transition-colors hover:bg-secondary " +
                        (i > 0 ? "border-t border-border" : "")
                      }
                    >
                      <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground/90">
                        {q.sql}
                      </code>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        {q.connName}
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/70">
                        {timeAgo(q.at)}
                      </span>
                      <ArrowRight
                        size={13}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}

            {boards.length > 0 && (
              <motion.section variants={listItem}>
                <SectionLabel>Boards</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {boards.map((b) => (
                    <Link
                      key={b.id}
                      href={`/boards/${b.id}`}
                      className="rounded-md border border-border px-3 py-2 text-[13px] transition-colors hover:bg-secondary"
                    >
                      {b.name}
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}
          </motion.div>
        )}
      </div>
    </NavigationLayout>
  );
}

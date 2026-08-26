"use client";

import { ArrowRight, CircleCheck, Cloud, Database, Ellipsis, Folder, GitBranch, History, House, Pencil, Plus, ScrollText, Search, SquareTerminal, Table as TableIcon, Trash2, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertDialog,
  AlertDialogContent,
  Button,
  Chip,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyIllustration,
  EnvBadge,
  IconButton,
  Kbd,
  StatusDot,
} from "@/components/orbit";
import { bumpConnection, connectionLastOpened } from "@/lib/connection-frecency";
import { groupByFolder } from "@/lib/folder-grouping";
import { listContainer, listItem } from "@/lib/motion";
import { getHistory } from "@/lib/query-history";
import type { Schedule } from "@/lib/schedules";
import { tableFrecencyEntries } from "@/lib/table-frecency";
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

interface AuthState {
  mode: string;
  email: string | null;
  workspaceName: string | null;
}

interface CloudLinkState {
  signedIn: boolean;
  email: string | null;
}

interface ConfigState {
  isRepo: boolean;
}

type RecentWork =
  | {
      kind: "query";
      sql: string;
      connId: string;
      connName: string;
      at: number;
    }
  | {
      kind: "table";
      table: string;
      connId: string;
      connName: string;
      at: number;
    };

const DRIVER_LABEL: Record<string, string> = {
  postgres: "Postgres",
  mysql: "MySQL",
  clickhouse: "ClickHouse",
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

const optionalFetcher = async <T,>(url: string): Promise<T | null> => {
  const response = await fetch(url);
  return response.ok ? (response.json() as Promise<T>) : null;
};

function timeAgo(ms: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.round(days / 7)}w ago`;
}

function identityColor(name: string): string {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `oklch(0.65 0.14 ${hash % 360})`;
}

function queryPreview(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function SectionLabel({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 className="text-ui-small font-[var(--weight-medium)] [color:var(--content-tertiary)]">
        {children}
      </h2>
      {aside}
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone = "quiet",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "quiet" | "good";
}) {
  return (
    <div className="border-border-subtle flex items-start gap-2.5 border-t px-3 py-3 first:border-t-0">
      <span
        className={
          "mt-0.5 shrink-0 " +
          (tone === "good"
            ? "[color:var(--intent-success)]"
            : "[color:var(--content-tertiary)]")
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ui-small block font-[var(--weight-medium)] [color:var(--content-primary)]">
          {label}
        </span>
        <span className="text-ui-caption mt-0.5 block truncate [color:var(--content-tertiary)]">
          {value}
        </span>
      </span>
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading, mutate } = useSWR<{
    connections: Conn[];
    syncedAt?: number;
  }>("/api/db", fetcher, { refreshInterval: 5000 });
  const { data: boardData } = useSWR<{ boards?: Board[] } | null>(
    "/api/boards",
    optionalFetcher,
    { shouldRetryOnError: false }
  );
  const { data: auth } = useSWR<AuthState>("/api/auth/me", fetcher);
  const { data: cloudLink } = useSWR<CloudLinkState>("/api/cloud-link", fetcher);
  const { data: config } = useSWR<ConfigState>("/api/config", fetcher, {
    shouldRetryOnError: false,
  });

  const isCloud = auth?.mode === "cloud";
  const cloudActive = isCloud || !!cloudLink?.signedIn;
  const { data: scheduleData } = useSWR<{ schedules: Schedule[] } | null>(
    cloudActive ? "/api/schedules" : null,
    optionalFetcher,
    { refreshInterval: 15000, shouldRetryOnError: false }
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);
  const boards = boardData?.boards ?? [];
  const connectionKey = connections.map((connection) => connection.id).join(",");
  const [lastOpened, setLastOpened] = useState<Record<string, number>>({});
  const [recentWork, setRecentWork] = useState<RecentWork[]>([]);
  const [busyConnections, setBusyConnections] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Conn | null>(null);

  useEffect(() => setLastOpened(connectionLastOpened()), []);

  useEffect(() => {
    if (!connections.length) {
      setRecentWork([]);
      return;
    }

    const work: RecentWork[] = [];
    for (const connection of connections) {
      const scope = `/vault/${connection.id}`;
      for (const query of getHistory(scope).slice(0, 4)) {
        work.push({
          kind: "query",
          sql: query.sql,
          connId: connection.id,
          connName: connection.name,
          at: query.at,
        });
      }
      for (const table of tableFrecencyEntries(scope).slice(0, 4)) {
        work.push({
          kind: "table",
          table: table.table,
          connId: connection.id,
          connName: connection.name,
          at: table.last,
        });
      }
    }

    setRecentWork(work.sort((a, b) => b.at - a.at).slice(0, 5));
  }, [connectionKey, connections]);

  const groupedConnections = useMemo(() => {
    const sorted = [...connections].sort(
      (a, b) => (lastOpened[b.id] ?? 0) - (lastOpened[a.id] ?? 0)
    );
    return groupByFolder(sorted);
  }, [connections, lastOpened]);

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyConnections((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const connectionAction = useCallback(
    async (
      connection: Conn,
      action: "test" | "disconnect" | "readonly",
      value?: boolean
    ) => {
      setBusy(connection.id, true);
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, action, value }),
      }).catch(() => null);
      setBusy(connection.id, false);
      mutate();
    },
    [mutate, setBusy]
  );

  const deleteConnection = useCallback((connection: Conn) => {
    setPendingDelete(connection);
  }, []);

  const confirmDelete = useCallback(
    async () => {
      const connection = pendingDelete;
      if (!connection) return;
      await fetch(`/api/connections?id=${encodeURIComponent(connection.id)}`, {
        method: "DELETE",
      }).catch(() => null);
      setPendingDelete(null);
      mutate();
    },
    [pendingDelete, mutate]
  );

  const resumeWork = (work: RecentWork) => {
    const pathname = `/vault/${work.connId}`;
    const key =
      work.kind === "query"
        ? `pmsql.resume.query:${pathname}`
        : `pmsql.resume.table:${pathname}`;
    window.sessionStorage.setItem(key, work.kind === "query" ? work.sql : work.table);
    bumpConnection(work.connId);
  };

  const connectedCount = connections.filter(
    (connection) => connection.status?.connected
  ).length;
  const idleCount = connections.length - connectedCount;
  const activeSchedules =
    scheduleData?.schedules.filter((schedule) => schedule.enabled) ?? [];
  const lastScheduleRun = Math.max(
    0,
    ...(scheduleData?.schedules.map((schedule) => schedule.lastRunAt ?? 0) ?? [])
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 5
      ? "Working late"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  })();

  return (
    <NavigationLayout>
      {/* Top bar — sticky, aligns with the sidebar header (h-12) */}
      <div className="bg-surface-panel border-border-subtle sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-3 border-b px-5">
        <div className="flex items-center gap-2">
          <House size={16} className="[color:var(--content-tertiary)]" />
          <span className="text-ui-default font-[var(--weight-medium)] [color:var(--content-primary)]">
            Home
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
            className="border-border-default bg-surface-panel text-ui-small hover:bg-surface-hover flex h-7 items-center gap-2 rounded-[var(--radius-control)] border px-2.5 [color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search</span>
            <Kbd>⌘K</Kbd>
          </button>
          <Button as="link" href="/connections/new" size="sm" variant="primary">
            <Plus size={15} />
            New connection
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <header className="mb-8">
          <h1 className="text-heading-medium font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">
            {greeting}
          </h1>
          {connections.length > 0 ? (
            <p className="text-ui-small mt-1 [color:var(--content-tertiary)]">
              {connections.length}{" "}
              {connections.length === 1 ? "database" : "databases"} · pick up
              where you left off
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="border-border-default bg-surface-panel divide-border-subtle divide-y overflow-hidden rounded-[var(--radius-panel)] border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-surface-hover h-12 animate-pulse" />
              ))}
            </div>
            <div className="border-border-default bg-surface-hover h-52 animate-pulse rounded-[var(--radius-panel)] border" />
          </div>
        ) : connections.length === 0 ? (
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border px-8 py-16 text-center">
            <EmptyIllustration size={104} className="mx-auto mb-5 [color:var(--content-tertiary)]" />
            <p className="text-body font-[var(--weight-medium)] [color:var(--content-primary)]">
              No databases connected
            </p>
            <p className="text-ui-small mx-auto mt-1.5 max-w-xs [color:var(--content-tertiary)]">
              Connect Postgres, MySQL, or ClickHouse to browse data and run SQL.
            </p>
            <Button
              as="link"
              href="/connections/new"
              size="sm"
              variant="primary"
              className="mx-auto mt-6"
            >
              <Plus size={15} /> Connect a database
            </Button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-10"
          >
            <div className="min-w-0 space-y-9">
              {recentWork.length > 0 && (
                <motion.section variants={listItem}>
                  <SectionLabel>Continue working</SectionLabel>
                  <div className="border-border-default bg-surface-panel divide-border-subtle divide-y overflow-hidden rounded-[var(--radius-panel)] border">
                    {recentWork.map((work, index) => (
                      <Link
                        key={`${work.kind}-${work.connId}-${work.at}-${index}`}
                        href={`/vault/${work.connId}`}
                        onClick={() => resumeWork(work)}
                        className="group hover:bg-surface-hover flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors"
                      >
                        <span className="bg-surface-hover grid size-6 shrink-0 place-items-center rounded-[var(--radius-small)] [color:var(--content-tertiary)]">
                          {work.kind === "query" ? (
                            <SquareTerminal size={14} />
                          ) : (
                            <TableIcon size={14} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              "block truncate text-ui-small [color:var(--content-primary)] " +
                              (work.kind === "query" ? "font-mono" : "font-[var(--weight-medium)]")
                            }
                          >
                            {work.kind === "query" ? queryPreview(work.sql) : work.table}
                          </span>
                          <span className="text-ui-caption mt-0.5 block [color:var(--content-tertiary)]">
                            {work.connName} · {work.kind === "query" ? "Query" : "Table"}
                          </span>
                        </span>
                        <span className="text-ui-caption shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
                          {timeAgo(work.at)}
                        </span>
                        <ArrowRight
                          size={13}
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [color:var(--content-tertiary)]"
                        />
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}

              <motion.section variants={listItem}>
                <SectionLabel
                  aside={
                    <span className="text-ui-caption [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
                      {connections.length}
                    </span>
                  }
                >
                  Databases
                </SectionLabel>
                <div className="space-y-5">
                  {groupedConnections.keys.map((folder) => {
                    const folderConnections = groupedConnections.groups.get(folder) ?? [];
                    return (
                      <div key={folder || "_ungrouped"}>
                        {groupedConnections.keys.length > 1 && (
                          <div className="text-ui-small mb-1 flex h-7 items-center gap-1.5 px-1 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
                            <Folder size={13} />
                            <span>{folder || "Ungrouped"}</span>
                            <span className="[font-variant-numeric:tabular-nums] opacity-70">
                              {folderConnections.length}
                            </span>
                          </div>
                        )}
                        <div className="border-border-default bg-surface-panel divide-border-subtle divide-y overflow-hidden rounded-[var(--radius-panel)] border">
                          {folderConnections.map((connection) => {
                            const connected = !!connection.status?.connected;
                            const busy = busyConnections.has(connection.id);
                            const host = connection.host
                              ? `${connection.host}${connection.port ? `:${connection.port}` : ""}${connection.database ? `/${connection.database}` : ""}`
                              : connection.folder ?? "";
                            return (
                              <div
                                key={connection.id}
                                className="group hover:bg-surface-hover flex h-12 items-center transition-colors"
                              >
                                <Link
                                  href={`/vault/${connection.id}`}
                                  onClick={() => bumpConnection(connection.id)}
                                  className="flex min-w-0 flex-1 items-center gap-2.5 px-4"
                                >
                                  <span
                                    className="size-2 shrink-0 rounded-[3px]"
                                    style={{ background: identityColor(connection.name) }}
                                  />
                                  <span className="text-ui-default max-w-[45%] shrink-0 truncate font-[var(--weight-medium)] [color:var(--content-primary)]">
                                    {connection.name}
                                  </span>
                                  <Chip className="hidden shrink-0 sm:inline-flex">
                                    {DRIVER_LABEL[connection.driver] ?? connection.driver}
                                  </Chip>
                                  <EnvBadge environment={connection.environment} />
                                  <span className="text-ui-caption hidden min-w-0 flex-1 truncate font-mono [color:var(--content-tertiary)] md:block">
                                    {host}
                                  </span>
                                  <span className="text-ui-caption ml-auto hidden shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums] sm:block">
                                    {lastOpened[connection.id]
                                      ? timeAgo(lastOpened[connection.id])
                                      : ""}
                                  </span>
                                  <StatusDot status={connected ? "live" : "idle"} />
                                </Link>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <IconButton
                                      size="sm"
                                      aria-label={`Actions for ${connection.name}`}
                                      className="mr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                    >
                                      <Ellipsis size={16} />
                                    </IconButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={() => connectionAction(connection, "test")}
                                    >
                                      <Wifi size={14} className="mr-2" />
                                      {connected ? "Retry connection" : "Connect"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!connected || busy}
                                      onClick={() => connectionAction(connection, "disconnect")}
                                    >
                                      <WifiOff size={14} className="mr-2" />
                                      Disconnect
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={() =>
                                        connectionAction(
                                          connection,
                                          "readonly",
                                          !connection.readOnly
                                        )
                                      }
                                    >
                                      <ScrollText size={14} className="mr-2" />
                                      {connection.readOnly ? "Allow writes" : "Make read-only"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link href={`/connections/${connection.id}/edit`}>
                                        <Pencil size={14} className="mr-2" />
                                        Edit connection
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="[color:var(--intent-danger)] focus:[color:var(--intent-danger)]"
                                      onClick={() => deleteConnection(connection)}
                                    >
                                      <Trash2 size={14} className="mr-2" />
                                      Delete connection
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>

              {boards.length > 0 && (
                <motion.section variants={listItem}>
                  <SectionLabel>Boards</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {boards.map((board) => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.id}`}
                        className="border-border-default bg-surface-panel text-ui-small hover:bg-surface-hover rounded-[var(--radius-control)] border px-3 py-2 transition-colors [color:var(--content-primary)]"
                      >
                        {board.name}
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            <motion.aside variants={listItem} className="lg:sticky lg:top-8">
              <SectionLabel>Status</SectionLabel>
              <div className="border-border-default bg-surface-panel overflow-hidden rounded-[var(--radius-panel)] border">
                <StatusRow
                  icon={
                    connectedCount === connections.length ? (
                      <CircleCheck size={15} fill="currentColor" />
                    ) : (
                      <Database size={15} />
                    )
                  }
                  label="Connections"
                  value={
                    idleCount === 0
                      ? `All ${connections.length} ready`
                      : `${connectedCount} ready · ${idleCount} idle`
                  }
                  tone={idleCount === 0 ? "good" : "quiet"}
                />
                <StatusRow
                  icon={<GitBranch size={15} />}
                  label="Vault"
                  value={
                    isCloud
                      ? auth?.workspaceName || "Cloud workspace"
                      : config?.isRepo
                        ? data?.syncedAt
                          ? `Git sync · changed ${timeAgo(data.syncedAt)}`
                          : "Git sync enabled"
                        : "Encrypted local vault"
                  }
                  tone={config?.isRepo || isCloud ? "good" : "quiet"}
                />
                <StatusRow
                  icon={<Cloud size={15} />}
                  label="Cloud"
                  value={
                    isCloud
                      ? auth?.email || "Signed in"
                      : cloudLink?.signedIn
                        ? cloudLink.email || "Linked"
                        : "Not linked"
                  }
                  tone={cloudActive ? "good" : "quiet"}
                />
                {cloudActive && scheduleData && (
                  <StatusRow
                    icon={<History size={15} />}
                    label="Scheduled queries"
                    value={
                      activeSchedules.length === 0
                        ? "None active"
                        : `${activeSchedules.length} active${
                            lastScheduleRun ? ` · ran ${timeAgo(lastScheduleRun)}` : ""
                          }`
                    }
                    tone={activeSchedules.length > 0 ? "good" : "quiet"}
                  />
                )}
              </div>

              <button
                onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
                className="border-border-default bg-surface-panel text-ui-small hover:bg-surface-hover mt-3 flex w-full items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2.5 text-left [color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
              >
                <Search size={14} />
                <span className="flex-1">Jump anywhere</span>
                <Kbd>⌘K</Kbd>
              </button>
            </motion.aside>
          </motion.div>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent
          title={`Delete connection “${pendingDelete?.name ?? ""}”?`}
          description="This removes the connection from your vault. This can't be undone."
          confirmLabel="Delete"
          cancelLabel="Keep it"
          onConfirm={confirmDelete}
        />
      </AlertDialog>
    </NavigationLayout>
  );
}

"use client";

import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  Cloud,
  Database,
  DotsThree,
  Folder,
  GitBranch,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  ReadCvLogo,
  Table as TableIcon,
  TerminalWindow,
  Trash,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";
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
      <h2 className="text-xs font-semibold text-muted-foreground">{children}</h2>
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
    <div className="flex items-start gap-2.5 border-t border-border/60 px-3 py-3 first:border-t-0">
      <span
        className={
          "mt-0.5 shrink-0 " +
          (tone === "good"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground")
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
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

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
            {(() => {
              const hour = new Date().getHours();
              return hour < 5
                ? "Working late"
                : hour < 12
                  ? "Good morning"
                  : hour < 18
                    ? "Good afternoon"
                    : "Good evening";
            })()}
          </h1>
          <Button as="link" href="/connections/new" size="sm" variant="primary">
            <Plus size={15} weight="bold" />
            New connection
          </Button>
        </header>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={
                    "h-12 animate-pulse bg-secondary/50 " +
                    (index > 0 ? "border-t border-border" : "")
                  }
                />
              ))}
            </div>
            <div className="h-52 animate-pulse rounded-lg border border-border bg-secondary/40" />
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-8 py-16 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg border border-border text-muted-foreground">
              <Database size={22} />
            </div>
            <p className="text-[15px] font-medium text-foreground">No databases connected</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-muted-foreground">
              Connect Postgres, MySQL, or ClickHouse to browse data and run SQL.
            </p>
            <Button
              as="link"
              href="/connections/new"
              size="sm"
              variant="primary"
              className="mx-auto mt-6"
            >
              <Plus size={15} weight="bold" /> Connect a database
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
                  <div className="overflow-hidden rounded-lg border border-border bg-background">
                    {recentWork.map((work, index) => (
                      <Link
                        key={`${work.kind}-${work.connId}-${work.at}-${index}`}
                        href={`/vault/${work.connId}`}
                        onClick={() => resumeWork(work)}
                        className={
                          "group flex min-h-11 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-secondary " +
                          (index > 0 ? "border-t border-border/60" : "")
                        }
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                          {work.kind === "query" ? (
                            <TerminalWindow size={14} />
                          ) : (
                            <TableIcon size={14} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              "block truncate text-[12.5px] text-foreground/90 " +
                              (work.kind === "query" ? "font-mono" : "font-medium")
                            }
                          >
                            {work.kind === "query" ? queryPreview(work.sql) : work.table}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {work.connName} · {work.kind === "query" ? "Query" : "Table"}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                          {timeAgo(work.at)}
                        </span>
                        <ArrowRight
                          size={13}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                        />
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}

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
                <div className="space-y-5">
                  {groupedConnections.keys.map((folder) => {
                    const folderConnections = groupedConnections.groups.get(folder) ?? [];
                    return (
                      <div key={folder || "_ungrouped"}>
                        {groupedConnections.keys.length > 1 && (
                          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
                            <Folder size={12} />
                            <span>{folder || "Ungrouped"}</span>
                            <span className="tabular-nums opacity-60">{folderConnections.length}</span>
                          </div>
                        )}
                        <div className="overflow-hidden rounded-lg border border-border bg-background">
                          {folderConnections.map((connection, index) => {
                            const connected = !!connection.status?.connected;
                            const busy = busyConnections.has(connection.id);
                            return (
                              <div
                                key={connection.id}
                                className={
                                  "group flex h-12 items-center transition-colors hover:bg-secondary " +
                                  (index > 0 ? "border-t border-border/60" : "")
                                }
                              >
                                <Link
                                  href={`/vault/${connection.id}`}
                                  onClick={() => bumpConnection(connection.id)}
                                  className="grid min-w-0 flex-1 grid-cols-[8px_minmax(105px,1fr)_max-content_minmax(0,1.25fr)_50px_8px] items-center gap-2.5 px-3.5 sm:grid-cols-[8px_minmax(130px,1fr)_max-content_max-content_minmax(0,1.5fr)_58px_8px] sm:gap-3"
                                >
                                  <span
                                    className="h-2 w-2 rounded-[3px]"
                                    style={{ background: identityColor(connection.name) }}
                                  />
                                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                                    {connection.name}
                                  </span>
                                  <Chip className="hidden sm:inline-flex">
                                    {DRIVER_LABEL[connection.driver] ?? connection.driver}
                                  </Chip>
                                  <EnvBadge environment={connection.environment} />
                                  <span className="hidden truncate font-mono text-[11px] text-muted-foreground/80 sm:block">
                                    {connection.host
                                      ? `${connection.host}${connection.port ? `:${connection.port}` : ""}${connection.database ? `/${connection.database}` : ""}`
                                      : connection.folder ?? ""}
                                  </span>
                                  <span className="text-right text-[11px] tabular-nums text-muted-foreground">
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
                                      <DotsThree size={16} weight="bold" />
                                    </IconButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                      disabled={busy}
                                      onClick={() => connectionAction(connection, "test")}
                                    >
                                      <WifiHigh size={14} className="mr-2" />
                                      {connected ? "Retry connection" : "Connect"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!connected || busy}
                                      onClick={() => connectionAction(connection, "disconnect")}
                                    >
                                      <WifiSlash size={14} className="mr-2" />
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
                                      <ReadCvLogo size={14} className="mr-2" />
                                      {connection.readOnly ? "Allow writes" : "Make read-only"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link href={`/connections/${connection.id}/edit`}>
                                        <PencilSimple size={14} className="mr-2" />
                                        Edit connection
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() => deleteConnection(connection)}
                                    >
                                      <Trash size={14} className="mr-2" />
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
                        className="rounded-md border border-border bg-background px-3 py-2 text-[13px] transition-colors hover:bg-secondary"
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
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <StatusRow
                  icon={
                    connectedCount === connections.length ? (
                      <CheckCircle size={15} weight="fill" />
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
                    icon={<ClockCounterClockwise size={15} />}
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
                className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <MagnifyingGlass size={14} />
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

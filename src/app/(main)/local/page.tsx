"use client";

import {
  ArrowRight,
  CaretRight,
  Database,
  Plus,
  Terminal,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";

interface VaultConn {
  id: string;
  name: string;
  driver: string;
  createdAt: number;
  folder?: string;
  readOnly?: boolean;
}

// Each engine gets a distinct mark colour so a list of connections is scannable
// by type at a glance (echoes the landing page's driver dots).
const DRIVER: Record<string, { label: string; color: string }> = {
  postgres: { label: "PostgreSQL", color: "#4a8fd6" },
  mysql: { label: "MySQL", color: "#26c0dc" },
  clickhouse: { label: "ClickHouse", color: "#e0b500" },
};

function driverInfo(d: string) {
  return DRIVER[d] ?? { label: d, color: "#8a8a8a" };
}

function addedLabel(ts: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function LocalConnectionPage() {
  const { data, isLoading } = useSWR<{ connections: VaultConn[] }>(
    "/api/connections",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);

  // Group by folder; the empty-string folder (ungrouped) sorts first.
  const groups = useMemo(() => {
    const m = new Map<string, VaultConn[]>();
    for (const c of connections) {
      const k = c.folder?.trim() || "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return [...m.entries()].sort(([a], [b]) =>
      a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)
    );
  }, [connections]);

  return (
    <NavigationLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-8 md:p-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
              {connections.length > 0
                ? `${connections.length} database${connections.length === 1 ? "" : "s"}`
                : "workspace"}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Databases</h1>
          </div>
          <Link
            href="/connections/new"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-[#16150a] shadow-sm transition-transform hover:-translate-y-px"
          >
            <Plus size={16} weight="bold" />
            New connection
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-px pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3.5"
                style={{ opacity: 1 - i * 0.25 }}
              >
                <div className="h-9 w-9 animate-pulse rounded-lg bg-neutral-150 dark:bg-neutral-850" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-neutral-150 dark:bg-neutral-850" />
                  <div className="h-2.5 w-24 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                </div>
              </div>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <Database size={26} className="text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold">No databases yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-neutral-500">
              Connect your first database to start browsing data and running SQL.
            </p>
            <Link
              href="/connections/new"
              className="mt-6 flex items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-[#16150a] transition-transform hover:-translate-y-px"
            >
              <Plus size={16} weight="bold" />
              Add your first connection
            </Link>
            <p className="mt-5 flex items-center gap-1.5 font-mono text-xs text-neutral-400">
              <Terminal size={13} />
              prefer the terminal? <code className="text-neutral-500">pmsql conn add</code>
            </p>
          </div>
        ) : (
          <div className="pt-2">
            {groups.map(([folder, items]) => (
              <div key={folder || "_"} className="mt-4 first:mt-2">
                {folder && (
                  <div className="mb-1 flex items-center gap-1.5 px-1 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                    <CaretRight size={10} weight="bold" />
                    {folder}
                  </div>
                )}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {items.map((conn) => {
                    const d = driverInfo(conn.driver);
                    return (
                      <Link
                        key={conn.id}
                        href={`/vault/${conn.id}`}
                        className="group -mx-3 flex items-center gap-3.5 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                      >
                        {/* driver mark */}
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-white"
                          style={{
                            background: d.color,
                            borderColor: "rgba(0,0,0,0.08)",
                          }}
                        >
                          <Database size={17} weight="fill" className="opacity-90" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{conn.name}</span>
                            {conn.readOnly && (
                              <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
                                read-only
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-neutral-400">
                            <span style={{ color: d.color }}>{d.label}</span>
                            {conn.createdAt ? (
                              <>
                                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                <span>added {addedLabel(conn.createdAt)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <ArrowRight
                          size={16}
                          className="shrink-0 -translate-x-1 text-neutral-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-neutral-600"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}

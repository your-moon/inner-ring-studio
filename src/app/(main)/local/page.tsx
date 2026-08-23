"use client";

import {
  CaretRight,
  CircleNotch,
  Database,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
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

// Per-engine identity so a card reads at a glance. Tinted neutrals + one accent
// per driver — no loud fills.
const DRIVER: Record<string, { label: string; tile: string }> = {
  postgres: {
    label: "PostgreSQL",
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
  },
  mysql: {
    label: "MySQL",
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  },
  clickhouse: {
    label: "ClickHouse",
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
};
const driverInfo = (d: string) =>
  DRIVER[d] ?? {
    label: d,
    tile: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  };

export default function LocalConnectionPage() {
  const { data, isLoading } = useSWR<{ connections: VaultConn[] }>(
    "/api/connections",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);
  // Opening a connection navigates to the studio; show a spinner on the clicked
  // card immediately so the click clearly registers.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.folder ?? "").toLowerCase().includes(q) ||
        driverInfo(c.driver).label.toLowerCase().includes(q)
    );
  }, [connections, query]);

  return (
    <NavigationLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
              {connections.length > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {connections.length}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Your saved databases. Open one to browse data and run SQL.
            </p>
          </div>
          <Link
            href="/connections/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#f2df00]"
          >
            <Plus size={16} weight="bold" />
            New connection
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-neutral-300 py-20 text-center dark:border-neutral-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Database size={24} className="text-neutral-500" />
            </div>
            <div>
              <p className="font-medium">No connections yet</p>
              <p className="mt-1 max-w-sm text-sm text-neutral-500">
                Add your first database to start browsing and querying.
              </p>
            </div>
            <Link
              href="/connections/new"
              className="flex items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00]"
            >
              <Plus size={16} weight="bold" />
              Add your first connection
            </Link>
            <p className="text-xs text-neutral-400">
              Prefer the terminal? Use the <code>pmsql conn add</code> CLI.
            </p>
          </div>
        ) : (
          <>
            {/* Filter — quietly present, useful once the list grows. */}
            <div className="relative -mt-2 max-w-xs">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Filter connections…"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-neutral-600"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">
                No connections match “{query.trim()}”.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((conn) => {
                  const info = driverInfo(conn.driver);
                  const opening = openingId === conn.id;
                  return (
                    <Link
                      key={conn.id}
                      href={`/vault/${conn.id}`}
                      onClick={() => setOpeningId(conn.id)}
                      aria-busy={opening}
                      className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${info.tile}`}
                      >
                        {opening ? (
                          <CircleNotch size={18} weight="bold" className="animate-spin" />
                        ) : (
                          <Database size={18} weight="fill" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold">{conn.name}</span>
                          {conn.readOnly && (
                            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-950/50 dark:text-amber-400">
                              RO
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-neutral-500">
                          <span>{info.label}</span>
                          {conn.folder && (
                            <>
                              <span className="text-neutral-300 dark:text-neutral-600">
                                ·
                              </span>
                              <span className="truncate">{conn.folder}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <CaretRight
                        size={16}
                        className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </NavigationLayout>
  );
}

"use client";

import {
  ArrowClockwise,
  Database,
  DotsThreeVertical,
  Lightning,
  LightningSlash,
  PencilSimple,
  PlugsConnected,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback } from "react";
import useSWR from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationLayout from "../nav-layout";

interface ConnRow {
  id: string;
  name: string;
  driver: string;
  folder?: string;
  readOnly?: boolean;
  status: { connected: boolean; total: number; idle: number; waiting: number };
}

const DRIVER_LABEL: Record<string, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  clickhouse: "ClickHouse",
};

export default function ConnectionManagerPage() {
  const { data, mutate } = useSWR<{ connections: ConnRow[] }>(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 4000 }
  );

  const act = useCallback(
    async (
      connectionId: string,
      action: "test" | "disconnect" | "readonly",
      value?: boolean
    ) => {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action, value }),
      })
        .then((r) => r.json())
        .catch(() => {});
      mutate();
    },
    [mutate]
  );

  const del = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Delete connection "${name}"?`)) return;
      await fetch(`/api/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});
      mutate();
    },
    [mutate]
  );

  const rows = data?.connections ?? [];

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl p-8">
        <h1 className="mb-1 text-xl font-bold">Connections</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Live status of your database connections. Retry to (re)connect,
          disconnect to close the pool.
        </p>

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No connections yet.
          </div>
        )}

        <div className="space-y-2.5">
          {rows.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
                <Database size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  {c.readOnly && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-300">
                      read-only
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                  <span>{DRIVER_LABEL[c.driver] ?? c.driver}</span>
                  {c.folder && (
                    <>
                      <span>·</span>
                      <span>{c.folder}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-mono">
                    {c.status.total} open · {c.status.idle} idle
                  </span>
                </div>
              </div>

              {/* status */}
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
                <span
                  className={
                    "inline-block h-2 w-2 rounded-full " +
                    (c.status.connected
                      ? "bg-green-500"
                      : "bg-neutral-300 dark:bg-neutral-600")
                  }
                />
                {c.status.connected ? "Connected" : "Idle"}
              </span>

              {/* primary action + overflow */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => act(c.id, "test")}
                  title="Retry / reconnect"
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <ArrowClockwise size={13} /> Retry
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="More"
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <DotsThreeVertical size={18} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => act(c.id, "readonly", !c.readOnly)}>
                      {c.readOnly ? (
                        <>
                          <Lightning className="mr-2 h-4 w-4" /> Make writable
                        </>
                      ) : (
                        <>
                          <LightningSlash className="mr-2 h-4 w-4" /> Make read-only
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!c.status.connected}
                      onClick={() => act(c.id, "disconnect")}
                    >
                      <PlugsConnected className="mr-2 h-4 w-4" /> Disconnect
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/connections/${c.id}/edit`}>
                        <PencilSimple className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => del(c.id, c.name)}
                      className="text-red-600 focus:text-red-600 dark:text-red-400"
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NavigationLayout>
  );
}

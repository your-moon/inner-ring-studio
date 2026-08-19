"use client";

import { Database, Plus } from "@phosphor-icons/react";
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

export default function LocalConnectionPage() {
  const { data, isLoading } = useSWR<{ connections: VaultConn[] }>(
    "/api/connections",
    (url: string) => fetch(url).then((r) => r.json())
  );

  const connections = useMemo(() => data?.connections ?? [], [data]);

  return (
    <NavigationLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Connections</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Your saved databases. Open one to browse data and run SQL.
            </p>
          </div>
          <Link
            href="/connections/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00]"
          >
            <Plus size={16} weight="bold" />
            New connection
          </Link>
        </div>

        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn) => (
              <Link
                key={conn.id}
                href={`/vault/${conn.id}`}
                className="group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-[#e6d400] dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-neutral-500" />
                  <span className="truncate font-medium">{conn.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 uppercase dark:bg-neutral-800">
                    {conn.driver}
                  </span>
                  {conn.readOnly && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      Read-only
                    </span>
                  )}
                  {conn.folder && <span className="truncate">{conn.folder}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}

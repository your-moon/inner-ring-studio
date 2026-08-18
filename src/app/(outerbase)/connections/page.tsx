"use client";

import { useCallback } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";

interface ConnRow {
  id: string;
  name: string;
  driver: string;
  folder?: string;
  readOnly?: boolean;
  status: { connected: boolean; total: number; idle: number; waiting: number };
}

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

  const rows = data?.connections ?? [];

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl p-8">
        <h1 className="mb-1 text-xl font-bold">Connections</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Live status of your database connections. Retry to (re)connect,
          disconnect to close the pool.
        </p>

        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Connection</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Pool</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={4}>
                    No connections yet.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-neutral-100 dark:border-neutral-800"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      {c.name}
                      {c.readOnly && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-300">
                          read-only
                        </span>
                      )}
                    </div>
                    {c.folder && (
                      <div className="text-xs text-neutral-400">{c.folder}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={
                          "inline-block h-2 w-2 rounded-full " +
                          (c.status.connected ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-600")
                        }
                      />
                      {c.status.connected ? "Connected" : "Idle"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {c.status.total} open · {c.status.idle} idle
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => act(c.id, "readonly", !c.readOnly)}
                      className="mr-2 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:border-amber-500 hover:text-amber-600 dark:border-neutral-700"
                    >
                      {c.readOnly ? "Make writable" : "Make read-only"}
                    </button>
                    <button
                      onClick={() => act(c.id, "test")}
                      className="mr-2 rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:border-blue-500 dark:border-neutral-700"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => act(c.id, "disconnect")}
                      disabled={!c.status.connected}
                      className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:border-red-500 hover:text-red-500 disabled:opacity-40 dark:border-neutral-700"
                    >
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </NavigationLayout>
  );
}

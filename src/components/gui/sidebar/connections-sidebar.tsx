"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";

interface ConnRow {
  id: string;
  name: string;
  folder?: string;
  readOnly?: boolean;
  status?: { connected: boolean };
}

/**
 * Cross-connection navigator for the studio sidebar: lists every saved
 * connection (grouped by folder, with a live "active" dot) so you can switch
 * databases without leaving the workspace.
 */
export default function ConnectionsSidebar() {
  const pathname = usePathname();
  const { data } = useSWR<{ connections: ConnRow[] }>(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 5000 }
  );

  const conns = data?.connections ?? [];
  const folders = new Map<string, ConnRow[]>();
  for (const c of conns) {
    const k = c.folder?.trim() || "";
    if (!folders.has(k)) folders.set(k, []);
    folders.get(k)!.push(c);
  }
  const keys = [...folders.keys()].sort((a, b) =>
    a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h1 className="text-primary mb-4 text-xl font-medium">Databases</h1>
      {conns.length === 0 && (
        <p className="text-sm text-neutral-500">No connections.</p>
      )}
      {keys.map((folder) => (
        <div key={folder || "_"} className="mb-2">
          {folder && (
            <div className="px-1 pt-2 pb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {folder}
            </div>
          )}
          {folders.get(folder)!.map((c) => (
            <Link
              key={c.id}
              href={`/vault/${c.id}`}
              className={
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 " +
                (pathname.includes(c.id)
                  ? "bg-neutral-100 font-medium dark:bg-neutral-800"
                  : "")
              }
            >
              <span
                className={
                  "inline-block h-2 w-2 shrink-0 rounded-full " +
                  (c.status?.connected
                    ? "bg-green-500"
                    : "bg-neutral-300 dark:bg-neutral-600")
                }
              />
              <span className="truncate">{c.name}</span>
              {c.readOnly && (
                <span className="ml-auto rounded bg-amber-100 px-1 text-[9px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-300">
                  RO
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

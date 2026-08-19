"use client";
import {
  SidebarMenuHeader,
  SidebarMenuItem,
} from "@/components/sidebar-menu";
import { WEBSITE_NAME } from "@/const";
import { cn } from "@/lib/utils";
import {
  CaretDown,
  CaretRight,
  CloudArrowUp,
  Database,
  List,
  Plus,
  PlugsConnected,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useCallback, useState } from "react";
import useSWR from "swr";
import NavConnectionItem, { NavConnection } from "./nav-connection-item";

export default function NavigationLayout({ children }: PropsWithChildren) {
  const [mobileToggle, setMobileToggle] = useState(false);
  const pathname = usePathname();

  // Vault connections for the sidebar navigator, with live pool status.
  const { data: connData, mutate: mutateConns } = useSWR<{
    connections: NavConnection[];
  }>("/api/db", (u: string) => fetch(u).then((r) => r.json()), {
    refreshInterval: 5000,
  });

  const actOnConn = useCallback(
    async (id: string, action: "test" | "disconnect") => {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, action }),
      })
        .then((r) => r.json())
        .catch(() => {});
      mutateConns();
    },
    [mutateConns]
  );

  const onDeleteConn = useCallback(
    async (id: string, name: string) => {
      if (
        !window.confirm(
          `Delete connection "${name}"? This removes it from the vault.`
        )
      )
        return;
      await fetch(`/api/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});
      mutateConns();
    },
    [mutateConns]
  );

  const connFolders = new Map<string, NavConnection[]>();
  for (const c of connData?.connections ?? []) {
    const k = c.folder?.trim() || "";
    if (!connFolders.has(k)) connFolders.set(k, []);
    connFolders.get(k)!.push(c);
  }
  const connFolderKeys = [...connFolders.keys()].sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem("pmsql.sidebarFolders");
      return raw ? new Set<string>(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const toggleFolder = useCallback((f: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      try {
        window.localStorage.setItem(
          "pmsql.sidebarFolders",
          JSON.stringify([...next])
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex w-screen flex-col lg:h-screen lg:flex-row">
      <div className="bg-background sticky top-0 z-25 flex w-full shrink-0 flex-col overflow-hidden border-r-0 border-b lg:w-[250px] lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/local" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-800 dark:border-neutral-200">
              <div className="h-2 w-2 rounded-full bg-neutral-800 dark:bg-neutral-200" />
            </div>
            <span className="text-sm font-semibold">{WEBSITE_NAME}</span>
          </Link>
          <List
            className="block h-6 w-6 cursor-pointer lg:hidden"
            onClick={() => {
              setMobileToggle(!mobileToggle);
            }}
          />
        </div>

        {mobileToggle && (
          <div
            className="fixed top-0 right-0 bottom-0 left-0 z-25 backdrop-blur-md lg:hidden"
            onClick={() => {
              setMobileToggle(false);
            }}
          ></div>
        )}

        <div
          className={cn(
            "bg-background fixed right-0 z-50 flex hidden h-screen w-2/3 flex-1 overflow-scroll border-b border-l pb-2 md:w-1/2 lg:relative lg:z-0 lg:block lg:h-auto lg:w-auto",
            {
              block: mobileToggle,
            }
          )}
        >
          <div className="flex flex-1 flex-col">
            {(connData?.connections?.length ?? 0) > 0 && (
              <>
                <SidebarMenuHeader text="Databases" />
                {connFolderKeys.map((folder) => (
                  <div key={folder || "_ungrouped"}>
                    {folder && (
                      <button
                        onClick={() => toggleFolder(folder)}
                        className="flex w-full items-center gap-1 px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase hover:text-neutral-700 dark:hover:text-neutral-300"
                      >
                        {collapsedFolders.has(folder) ? (
                          <CaretRight size={10} weight="bold" />
                        ) : (
                          <CaretDown size={10} weight="bold" />
                        )}
                        {folder}
                      </button>
                    )}
                    {(!folder || !collapsedFolders.has(folder)) &&
                      connFolders.get(folder)!.map((conn) => (
                        <NavConnectionItem
                          key={conn.id}
                          conn={conn}
                          selected={pathname.includes(conn.id)}
                          onAction={actOnConn}
                          onDelete={onDeleteConn}
                        />
                      ))}
                  </div>
                ))}
              </>
            )}

            <SidebarMenuHeader text="Workspace" />
            <SidebarMenuItem
              selected={pathname === "/local"}
              text="All connections"
              icon={Database}
              href="/local"
            />
            <SidebarMenuItem
              text="New connection"
              icon={Plus}
              href="/connections/new"
              selected={pathname === "/connections/new"}
            />

            <SidebarMenuHeader text="Settings" />
            <SidebarMenuItem
              text="Connections"
              icon={PlugsConnected}
              href="/connections"
              selected={pathname === "/connections"}
            />
            <SidebarMenuItem
              text="Vault storage"
              icon={CloudArrowUp}
              href="/vault-storage"
              selected={pathname === "/vault-storage"}
            />
          </div>
        </div>
      </div>
      <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
        {children}
      </div>
    </div>
  );
}

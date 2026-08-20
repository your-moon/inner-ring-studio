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
  ChartBar,
  Clock,
  CloudArrowUp,
  Database,
  List,
  MagnifyingGlass,
  Plus,
  PlugsConnected,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useCallback, useState } from "react";
import { SignOut, User } from "@phosphor-icons/react";
import useSWR from "swr";
import NavConnectionItem, { NavConnection } from "./nav-connection-item";
import NotificationsBell from "./notifications-bell";
import WorkspaceSwitcher from "./workspace-switcher";
import CommandPalette from "./command-palette";

export default function NavigationLayout({ children }: PropsWithChildren) {
  const [mobileToggle, setMobileToggle] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auth state — drives the cloud user menu (email + account + sign out).
  const { data: me } = useSWR<{
    mode: string;
    authed: boolean;
    email: string | null;
    workspaceId: string | null;
    workspaceName: string | null;
    role: string | null;
  }>("/api/auth/me", (u: string) => fetch(u).then((r) => r.json()));
  const isCloud = me?.mode === "cloud";

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }, [router]);

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
      <CommandPalette />
      <div className="bg-background sticky top-0 z-25 flex w-full shrink-0 flex-col overflow-hidden border-r-0 border-b lg:w-[250px] lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/local" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-800 dark:border-neutral-200">
              <div className="h-2 w-2 rounded-full bg-neutral-800 dark:bg-neutral-200" />
            </div>
            <span className="text-sm font-semibold">{WEBSITE_NAME}</span>
          </Link>
          <div className="flex items-center gap-1">
            {isCloud && <NotificationsBell />}
            <List
              className="block h-6 w-6 cursor-pointer lg:hidden"
              onClick={() => {
                setMobileToggle(!mobileToggle);
              }}
            />
          </div>
        </div>

        {isCloud && (
          <WorkspaceSwitcher
            activeId={me?.workspaceId ?? null}
            activeName={me?.workspaceName ?? null}
          />
        )}

        <button
          onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
          className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-neutral-200 px-3.5 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
        >
          <MagnifyingGlass size={14} className="shrink-0" />
          <span className="flex-1">Search…</span>
          <kbd className="shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] dark:border-neutral-700">⌘K</kbd>
        </button>

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

            {/* Scheduled queries + alerts — a Cloud-exclusive feature. In
                self-hosted/desktop it shows as a quiet, non-nagging ghost that
                points at Cloud (passive marketing). */}
            {isCloud ? (
              <SidebarMenuItem
                text="Scheduled"
                icon={Clock}
                href="/schedules"
                selected={pathname.startsWith("/schedules")}
              />
            ) : (
              <Link
                href="https://cloud.carrot-soft.tech/signup"
                target="_blank"
                className="hover:bg-secondary flex h-8 items-center p-2 pl-4 text-sm text-neutral-400"
                title="Run queries on a schedule and get alerted — available on Inner Ring Cloud"
              >
                <Clock className="mr-2 h-4 w-4" />
                <span className="flex-1 text-left">Scheduled</span>
                <span className="rounded bg-[#FFEB02]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a07a00] dark:text-[#FFEB02]">
                  Cloud
                </span>
              </Link>
            )}

            {/* Boards (dashboards) — Cloud-exclusive, with the same passive ghost. */}
            {isCloud ? (
              <SidebarMenuItem
                text="Boards"
                icon={ChartBar}
                href="/boards"
                selected={pathname.startsWith("/boards")}
              />
            ) : (
              <Link
                href="https://cloud.carrot-soft.tech/signup"
                target="_blank"
                className="hover:bg-secondary flex h-8 items-center p-2 pl-4 text-sm text-neutral-400"
                title="Build live dashboards from your queries — available on Inner Ring Cloud"
              >
                <ChartBar className="mr-2 h-4 w-4" />
                <span className="flex-1 text-left">Boards</span>
                <span className="rounded bg-[#FFEB02]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#a07a00] dark:text-[#FFEB02]">
                  Cloud
                </span>
              </Link>
            )}

            <SidebarMenuHeader text="Settings" />
            <SidebarMenuItem
              text="Connections"
              icon={PlugsConnected}
              href="/connections"
              selected={pathname === "/connections"}
            />
            {/* Vault storage is a self-hosted/desktop concept (git-synced vault). */}
            {!isCloud && (
              <SidebarMenuItem
                text="Vault storage"
                icon={CloudArrowUp}
                href="/vault-storage"
                selected={pathname === "/vault-storage"}
              />
            )}
            {isCloud && (
              <SidebarMenuItem
                text="Account"
                icon={User}
                href="/account"
                selected={pathname === "/account"}
              />
            )}

            {/* Signed-in user footer (cloud). */}
            {isCloud && me?.authed && (
              <div className="mt-4 border-t border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href="/account"
                    className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                    title={me.email ?? ""}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
                      {(me.email ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-neutral-600 dark:text-neutral-300">
                      {me.email}
                    </span>
                  </Link>
                  <button
                    onClick={signOut}
                    title="Sign out"
                    className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <SignOut size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
        {children}
      </div>
    </div>
  );
}

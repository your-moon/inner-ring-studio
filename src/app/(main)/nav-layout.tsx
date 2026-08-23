"use client";
import {
  SidebarMenuHeader,
  SidebarMenuItem,
} from "@/components/sidebar-menu";
import { WEBSITE_NAME } from "@/const";
import { cn } from "@/lib/utils";
import { groupByFolder } from "@/lib/folder-grouping";
import { scopedStore } from "@/lib/scoped-store";
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
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { SignOut, User } from "@phosphor-icons/react";
import useSWR from "swr";
import NavConnectionItem, { NavConnection } from "./nav-connection-item";
import NotificationsBell from "./notifications-bell";
import WorkspaceSwitcher from "./workspace-switcher";
import VaultSwitcher from "./vault-switcher";
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

  // Linked mode (desktop): status of the browser-based cloud connection.
  const { data: link, mutate: mutateLink } = useSWR<{
    linked: boolean;
    signedIn: boolean;
    email: string | null;
    cloudUrl: string | null;
  }>("/api/cloud-link", (u: string) => fetch(u).then((r) => r.json()));
  const linked = !!link?.linked;
  const cloudSignedIn = linked && !!link?.signedIn;
  // Cloud features (Boards/Scheduled/etc.) are live when we're the cloud OR a
  // linked desktop that's signed in (requests get forwarded to the cloud).
  const cloudUi = isCloud || cloudSignedIn;

  const connectCloud = useCallback(async () => {
    const j = await fetch("/api/cloud-link/start")
      .then((r) => r.json())
      .catch(() => null);
    if (!j?.url) return;
    window.open(j.url, "_blank");
    // Poll for the callback to land, then refresh the nav.
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const s = await fetch("/api/cloud-link").then((r) => r.json()).catch(() => null);
      if (s?.signedIn || n > 150) {
        clearInterval(t);
        mutateLink();
      }
    }, 2000);
  }, [mutateLink]);

  const disconnectCloud = useCallback(async () => {
    await fetch("/api/cloud-link", { method: "DELETE" }).catch(() => {});
    mutateLink();
  }, [mutateLink]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }, [router]);

  // Vault connections for the sidebar navigator, with live pool status.
  const { data: connData, mutate: mutateConns } = useSWR<{
    connections: NavConnection[];
    syncedAt?: number;
  }>("/api/db", (u: string) => fetch(u).then((r) => r.json()), {
    refreshInterval: 5000,
  });

  // Toast once when a background git-vault sync pulls in remote connection
  // changes (e.g. an edit pushed from another device).
  const lastSyncRef = useRef(0);
  useEffect(() => {
    const s = connData?.syncedAt ?? 0;
    if (s > 0 && lastSyncRef.current > 0 && s > lastSyncRef.current) {
      toast("Connections updated — synced from another device");
    }
    if (s > lastSyncRef.current) lastSyncRef.current = s;
  }, [connData?.syncedAt]);

  // Connections with a connect/test in flight — drives the sidebar spinner so a
  // click (open) or a Connect/Retry gives immediate feedback instead of silence.
  const [busyConns, setBusyConns] = useState<Set<string>>(new Set());
  const setBusy = useCallback((id: string, on: boolean) => {
    setBusyConns((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const actOnConn = useCallback(
    async (id: string, action: "test" | "disconnect") => {
      if (action === "test") setBusy(id, true);
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, action }),
      })
        .then((r) => r.json())
        .catch(() => {});
      setBusy(id, false);
      mutateConns();
    },
    [mutateConns, setBusy]
  );

  // Opening a connection navigates to the studio (leaving this layout). Show a
  // spinner immediately so the click registers; a short fallback clears it if the
  // user cancels/stays. It resets naturally when this layout remounts.
  const onOpenConn = useCallback(
    (id: string) => {
      setBusy(id, true);
      window.setTimeout(() => setBusy(id, false), 8000);
    },
    [setBusy]
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

  const { keys: connFolderKeys, groups: connFolders } = groupByFolder(
    connData?.connections ?? []
  );

  // Folders default to collapsed; persist the set the user has EXPANDED.
  const folderStore = useMemo(
    () => scopedStore<string[]>("sidebarExpanded", []),
    []
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(folderStore.read())
  );
  const toggleFolder = useCallback(
    (f: string) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f);
        else next.add(f);
        folderStore.write([...next]);
        return next;
      });
    },
    [folderStore]
  );
  const isFolderOpen = (folder: string) => expandedFolders.has(folder);

  return (
    <div className="flex w-screen flex-col lg:h-screen lg:flex-row">
      <CommandPalette />
      <div className="bg-sidebar sticky top-0 z-25 flex w-full shrink-0 flex-col overflow-hidden border-r-0 border-b lg:w-[250px] lg:border-r lg:border-b-0">
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

        {/* Desktop / self-hosted: pick among local git-vaults on this machine. */}
        {me && !isCloud && <VaultSwitcher />}

        <button
          onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
          className="u-smooth mx-3 mb-2 flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-[13px] text-muted-foreground hover:bg-secondary"
        >
          <MagnifyingGlass size={14} className="shrink-0" />
          <span className="flex-1">Search…</span>
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
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
            "bg-sidebar fixed right-0 z-50 flex hidden h-screen w-2/3 flex-1 overflow-scroll border-b border-l pb-2 md:w-1/2 lg:relative lg:z-0 lg:block lg:h-auto lg:w-auto",
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
                        className="flex w-full items-center gap-1 px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                      >
                        {isFolderOpen(folder) ? (
                          <CaretDown size={10} weight="bold" />
                        ) : (
                          <CaretRight size={10} weight="bold" />
                        )}
                        {folder}
                        <span className="ml-1 font-normal normal-case opacity-60">
                          {connFolders.get(folder)!.length}
                        </span>
                      </button>
                    )}
                    {(!folder || isFolderOpen(folder)) &&
                      connFolders.get(folder)!.map((conn) => (
                        <NavConnectionItem
                          key={conn.id}
                          conn={conn}
                          selected={pathname.includes(conn.id)}
                          busy={busyConns.has(conn.id)}
                          onAction={actOnConn}
                          onDelete={onDeleteConn}
                          onOpen={onOpenConn}
                        />
                      ))}
                  </div>
                ))}
              </>
            )}

            <SidebarMenuHeader text="Workspace" />

            {/* Linked desktop: browser-based cloud sign-in unlocks the cloud
                features below (requests are forwarded to the cloud; DB queries
                still run locally). */}
            {linked && !cloudSignedIn && (
              <button
                onClick={connectCloud}
                className="mx-3 mb-1 flex h-8 items-center gap-2 px-2 text-left text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                title="Sign in to your cloud account in the browser"
              >
                <CloudArrowUp className="h-4 w-4" />
                <span className="flex-1">Connect to Cloud</span>
              </button>
            )}
            {cloudSignedIn && (
              <div className="group mx-3 mb-1 flex h-8 items-center gap-2 px-2 text-xs">
                <span
                  title="Connected to Cloud"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                <span
                  className="min-w-0 flex-1 truncate text-neutral-500"
                  title={link?.email ?? ""}
                >
                  {link?.email}
                </span>
                <button
                  onClick={disconnectCloud}
                  className="shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700 dark:hover:text-neutral-200"
                  title="Disconnect from Cloud"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Scheduled queries + alerts — a Cloud feature. In self-hosted/
                desktop-without-cloud it shows as a quiet ghost that points at
                Cloud (passive marketing). */}
            {cloudUi ? (
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
                className="group mx-2 flex h-7 items-center gap-2 rounded-md px-2 text-[13px] u-smooth text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Run queries on a schedule and get alerted — available on Inner Ring Cloud"
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Scheduled</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 u-smooth group-hover:opacity-100">
                  Cloud
                </span>
              </Link>
            )}

            {/* Boards (dashboards) — Cloud feature, with the same passive ghost. */}
            {cloudUi ? (
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
                className="group mx-2 flex h-7 items-center gap-2 rounded-md px-2 text-[13px] u-smooth text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Build live dashboards from your queries — available on Inner Ring Cloud"
              >
                <ChartBar className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Boards</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 u-smooth group-hover:opacity-100">
                  Cloud
                </span>
              </Link>
            )}

            <SidebarMenuHeader text="Manage" />
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
      <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-canvas">
        {children}
      </div>
    </div>
  );
}

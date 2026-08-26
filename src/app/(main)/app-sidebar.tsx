"use client";

import { ChartColumn, ChevronDown, ChevronRight, Clock, CloudUpload, Command, House, List, LogOut, PanelLeft, Plus, Search, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  Chip,
  IconButton,
  Kbd,
  SidebarNavItem,
  StatusDot,
} from "@/components/orbit";
import { WEBSITE_NAME } from "@/const";
import { groupByFolder } from "@/lib/folder-grouping";
import { scopedStore } from "@/lib/scoped-store";
import { cn } from "@/lib/utils";
import CommandPalette from "./command-palette";
import NavConnectionItem, { NavConnection } from "./nav-connection-item";
import NotificationsBell from "./notifications-bell";
import VaultSwitcher from "./vault-switcher";
import WorkspaceSwitcher from "./workspace-switcher";

interface AuthState {
  mode: string;
  authed: boolean;
  email: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
}

interface CloudLinkState {
  linked: boolean;
  signedIn: boolean;
  email: string | null;
}

function BrandMark() {
  return (
    <span className="border-border-strong grid h-5 w-5 shrink-0 place-items-center rounded-md border">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--content-primary)]" />
    </span>
  );
}

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-5 mb-1 flex h-7 items-center justify-between px-2">
      <span className="text-ui-small font-[var(--weight-medium)] [color:var(--content-tertiary)]">
        {children}
      </span>
      {action}
    </div>
  );
}

function NavRow({
  href,
  label,
  icon: Icon,
  selected,
  suffix,
  external,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  selected?: boolean;
  suffix?: React.ReactNode;
  external?: boolean;
}) {
  return (
    <SidebarNavItem
      icon={<Icon />}
      label={label}
      active={selected}
      count={suffix}
      href={external ? undefined : href}
      onClick={
        external
          ? () => window.open(href, "_blank", "noopener")
          : undefined
      }
    />
  );
}

/**
 * The complete application-navigation module. Its interface is intentionally
 * empty: callers render it, while workspace identity, connection management,
 * route state, mobile behavior, and cloud/vault status stay local here.
 */
export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const { data: auth } = useSWR<AuthState>("/api/auth/me", (url: string) =>
    fetch(url).then((response) => response.json())
  );
  const isCloud = auth?.mode === "cloud";

  const { data: cloudLink, mutate: mutateCloudLink } = useSWR<CloudLinkState>(
    "/api/cloud-link",
    (url: string) => fetch(url).then((response) => response.json())
  );
  const linked = !!cloudLink?.linked;
  const cloudSignedIn = linked && !!cloudLink?.signedIn;
  const cloudFeatures = isCloud || cloudSignedIn;

  const { data: connectionData, mutate: mutateConnections } = useSWR<{
    connections: NavConnection[];
    syncedAt?: number;
  }>("/api/db", (url: string) => fetch(url).then((response) => response.json()), {
    refreshInterval: 5000,
  });

  const lastSyncRef = useRef(0);
  useEffect(() => {
    const syncedAt = connectionData?.syncedAt ?? 0;
    if (
      syncedAt > 0 &&
      lastSyncRef.current > 0 &&
      syncedAt > lastSyncRef.current
    ) {
      toast("Connections updated from your synced vault");
    }
    if (syncedAt > lastSyncRef.current) lastSyncRef.current = syncedAt;
  }, [connectionData?.syncedAt]);

  const [busyConnections, setBusyConnections] = useState<Set<string>>(
    new Set()
  );
  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyConnections((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const actOnConnection = useCallback(
    async (id: string, action: "test" | "disconnect") => {
      setBusy(id, true);
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, action }),
      }).catch(() => null);
      setBusy(id, false);
      mutateConnections();
    },
    [mutateConnections, setBusy]
  );

  const openConnection = useCallback(
    (id: string) => {
      setBusy(id, true);
      window.setTimeout(() => setBusy(id, false), 8000);
    },
    [setBusy]
  );

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const deleteConnection = useCallback((id: string, name: string) => {
    setPendingDelete({ id, name });
  }, []);

  const confirmDelete = useCallback(
    async () => {
      if (!pendingDelete) return;
      await fetch(
        `/api/connections?id=${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" }
      ).catch(() => null);
      setPendingDelete(null);
      mutateConnections();
    },
    [pendingDelete, mutateConnections]
  );

  const groupedConnections = groupByFolder(connectionData?.connections ?? []);
  const collapsedStore = useMemo(
    () => scopedStore<string[]>("sidebarCollapsed", []),
    []
  );
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(collapsedStore.read())
  );
  const toggleFolder = useCallback(
    (folder: string) => {
      setCollapsedFolders((current) => {
        const next = new Set(current);
        if (next.has(folder)) next.delete(folder);
        else next.add(folder);
        collapsedStore.write([...next]);
        return next;
      });
    },
    [collapsedStore]
  );

  const connectCloud = useCallback(async () => {
    const result = await fetch("/api/cloud-link/start")
      .then((response) => response.json())
      .catch(() => null);
    if (!result?.url) return;
    window.open(result.url, "_blank");
    let attempts = 0;
    const poll = window.setInterval(async () => {
      attempts += 1;
      const state = await fetch("/api/cloud-link")
        .then((response) => response.json())
        .catch(() => null);
      if (state?.signedIn || attempts > 150) {
        window.clearInterval(poll);
        mutateCloudLink();
      }
    }, 2000);
  }, [mutateCloudLink]);

  const disconnectCloud = useCallback(async () => {
    await fetch("/api/cloud-link", { method: "DELETE" }).catch(() => null);
    mutateCloudLink();
  }, [mutateCloudLink]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
  }, [router]);

  const sidebar = (
    <aside
      aria-label="Application navigation"
      className={cn(
        "bg-surface-panel flex h-full min-h-0 flex-col",
        collapsed ? "w-0 overflow-hidden" : "w-[272px]"
      )}
    >
      {/* Workspace switcher (Attio-style, borderless) */}
      <div className="flex h-12 shrink-0 items-center gap-1 px-2">
        <Link
          href="/local"
          className="focus-ring flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] px-1.5 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
        >
          <BrandMark />
          <span className="text-ui-small min-w-0 flex-1 truncate font-semibold tracking-tight [color:var(--content-primary)]">
            {WEBSITE_NAME}
          </span>
          <ChevronDown className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
        </Link>
        {isCloud && <NotificationsBell />}
        <IconButton
          aria-label="Collapse sidebar"
          size="sm"
          className="hidden [&_svg]:size-3.5 lg:inline-grid"
          onClick={() => setCollapsed(true)}
        >
          <PanelLeft />
        </IconButton>
        <IconButton
          aria-label="Close navigation"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X />
        </IconButton>
      </div>

      {/* Quick actions + search (Attio-style) */}
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
          className="focus-ring border-border-default bg-surface-panel text-ui-small hover:bg-surface-hover flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] border px-2.5 [color:var(--content-secondary)]"
        >
          <Command className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
          <span className="min-w-0 flex-1 truncate text-left">Quick actions</span>
          <Kbd>⌘K</Kbd>
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={() => window.dispatchEvent(new Event("irs:cmdk"))}
          className="focus-ring border-border-default bg-surface-panel hover:bg-surface-hover grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] border [color:var(--content-tertiary)] hover:[color:var(--content-primary)] [&_svg]:size-3.5"
        >
          <Search />
        </button>
      </div>

      {isCloud ? (
        <WorkspaceSwitcher
          activeId={auth?.workspaceId ?? null}
          activeName={auth?.workspaceName ?? null}
        />
      ) : (
        auth && <VaultSwitcher />
      )}

      {/* Divider between the top controls and the nav menu (Attio-style) */}
      <div className="border-border-subtle mx-2 my-1 border-b" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <nav aria-label="Workspace">
          <NavRow
            href="/local"
            label="Home"
            icon={House}
            selected={pathname === "/local"}
          />
          <NavRow
            href={cloudFeatures ? "/schedules" : "https://cloud.carrot-soft.tech/signup"}
            label="Scheduled queries"
            icon={Clock}
            selected={pathname.startsWith("/schedules")}
            external={!cloudFeatures}
            suffix={!cloudFeatures ? <Chip>Cloud</Chip> : undefined}
          />
          <NavRow
            href={cloudFeatures ? "/boards" : "https://cloud.carrot-soft.tech/signup"}
            label="Boards"
            icon={ChartColumn}
            selected={pathname.startsWith("/boards")}
            external={!cloudFeatures}
            suffix={!cloudFeatures ? <Chip>Cloud</Chip> : undefined}
          />
        </nav>

        <SectionLabel
          action={
            <IconButton aria-label="New connection" size="sm" asChild>
              <Link href="/connections/new">
                <Plus />
              </Link>
            </IconButton>
          }
        >
          Connections
        </SectionLabel>

        <div>
          {groupedConnections.keys.map((folder) => {
            const items = groupedConnections.groups.get(folder) ?? [];
            const collapsed = !!folder && collapsedFolders.has(folder);
            return (
              <div key={folder || "_ungrouped"}>
                {folder && (
                  <button
                    onClick={() => toggleFolder(folder)}
                    aria-expanded={!collapsed}
                    className="text-ui-small flex h-7 w-full items-center gap-1.5 px-2 text-left font-[var(--weight-medium)] [color:var(--content-tertiary)] hover:[color:var(--content-secondary)]"
                  >
                    {collapsed ? (
                      <ChevronRight size={11} />
                    ) : (
                      <ChevronDown size={11} />
                    )}
                    <span className="min-w-0 flex-1 truncate">{folder}</span>
                    <span className="tabular-nums opacity-60">{items.length}</span>
                  </button>
                )}
                {!collapsed &&
                  items.map((connection) => (
                    <NavConnectionItem
                      key={connection.id}
                      conn={connection}
                      selected={pathname.includes(connection.id)}
                      busy={busyConnections.has(connection.id)}
                      onAction={actOnConnection}
                      onDelete={deleteConnection}
                      onOpen={openConnection}
                    />
                  ))}
              </div>
            );
          })}

          {(connectionData?.connections.length ?? 0) === 0 && (
            <Link
              href="/connections/new"
              className="text-ui-caption flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-strong px-2.5 py-2 [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
            >
              <Plus size={14} /> Add your first connection
            </Link>
          )}
        </div>
      </div>

      <div className="shrink-0 p-2 pt-1">
        {!isCloud && (
          <NavRow
            href="/vault-storage"
            label="Vault storage"
            icon={CloudUpload}
            selected={pathname === "/vault-storage"}
            suffix={<StatusDot status={connectionData?.syncedAt ? "live" : "idle"} />}
          />
        )}

        {linked && !cloudSignedIn && (
          <button
            onClick={connectCloud}
            className="text-ui-caption flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
          >
            <CloudUpload size={15} />
            <span className="flex-1 text-left">Connect to Cloud</span>
          </button>
        )}

        {cloudSignedIn && !isCloud && (
          <button
            onClick={disconnectCloud}
            className="text-ui-caption group flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
            title="Disconnect from Cloud"
          >
            <StatusDot status="live" />
            <span className="min-w-0 flex-1 truncate text-left">{cloudLink?.email}</span>
            <span className="opacity-0 group-hover:opacity-100">Disconnect</span>
          </button>
        )}

        {isCloud && auth?.authed && (
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] px-2 hover:bg-surface-hover",
                pathname === "/account" && "bg-surface-hover"
              )}
            >
              <span className="text-ui-caption grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-control)] bg-surface-hover font-semibold [color:var(--content-primary)]">
                {(auth.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="text-ui-caption min-w-0 flex-1 truncate [color:var(--content-tertiary)]">
                {auth.email}
              </span>
            </Link>
            <IconButton aria-label="Sign out" size="sm" onClick={signOut}>
              <LogOut />
            </IconButton>
          </div>
        )}

        {!isCloud && !cloudSignedIn && (
          <div className="text-ui-caption flex h-8 items-center gap-2 px-2 [color:var(--content-tertiary)]">
            <User size={14} />
            <span>Local workspace</span>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <CommandPalette />

      {/* Floating expand control shown when the sidebar is collapsed (desktop) */}
      {collapsed ? (
        <div className="fixed top-3 left-2 z-40 hidden lg:block">
          <IconButton
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeft />
          </IconButton>
        </div>
      ) : null}

      <div className="sticky top-0 z-30 flex h-12 w-full shrink-0 items-center justify-between border-b border-border-default bg-surface-panel px-3 lg:hidden">
        <Link href="/local" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-ui-small font-semibold">{WEBSITE_NAME}</span>
        </Link>
        <IconButton
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <List />
        </IconButton>
      </div>

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/15 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 -translate-x-full border-r border-border-default shadow-xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:translate-x-0 lg:shadow-none",
          mobileOpen && "translate-x-0"
        )}
      >
        {sidebar}
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
    </>
  );
}

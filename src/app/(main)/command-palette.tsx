"use client";

import { QuickOpen } from "@/components/ui/quick-open";
import {
  ChartBar,
  Clock,
  Database,
  Gear,
  type Icon,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cmd = {
  id: string;
  label: string;
  hint: string;
  icon: Icon;
  run: () => void;
};

const fetchJson = (u: string) => fetch(u).then((r) => r.json()).catch(() => ({}));

/**
 * ⌘K command palette: fuzzy-jump to any connection, board, workspace, or nav
 * action. Data is loaded lazily the first time it opens. Mounted once in the
 * app shell; a global key handler toggles it. The palette machinery (overlay,
 * fuzzy filter, keyboard nav) lives in the shared QuickOpen; this owns the
 * command model and its data sourcing.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dynamic, setDynamic] = useState<Cmd[]>([]);
  const [isCloud, setIsCloud] = useState(false);
  const loaded = useRef(false);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Static nav actions — always available.
  const staticCmds: Cmd[] = useMemo(
    () => [
      { id: "nav-local", label: "Home", hint: "Go to", icon: Database, run: () => go("/local") },
      { id: "nav-new", label: "New connection", hint: "Go to", icon: Plus, run: () => go("/connections/new") },
      ...(isCloud
        ? [
            { id: "nav-boards", label: "Boards", hint: "Go to", icon: ChartBar, run: () => go("/boards") },
            { id: "nav-sched", label: "Scheduled queries", hint: "Go to", icon: Clock, run: () => go("/schedules") },
            { id: "nav-ws", label: "Members & workspace settings", hint: "Go to", icon: UsersThree, run: () => go("/workspace") },
            { id: "nav-account", label: "Account", hint: "Settings", icon: Gear, run: () => go("/account") },
          ]
        : []),
    ],
    [go, isCloud]
  );

  // Lazy-load the first time the palette opens. Connections load FIRST and are
  // shown immediately — they're the most common target — so ⌘K is searchable
  // without waiting on mode detection or the cloud boards/workspaces round-trips.
  const load = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;

    const db = await fetchJson("/api/db");
    const connCmds: Cmd[] = (db.connections ?? []).map(
      (c: { id: string; name: string; driver?: string }) => ({
        id: `conn-${c.id}`,
        label: c.name,
        hint: c.driver ?? "Connection",
        icon: Database,
        run: () => go(`/vault/${c.id}`),
      })
    );
    setDynamic(connCmds);
    // If nothing came back (transient failure), allow a retry on next open.
    if (connCmds.length === 0) loaded.current = false;

    const me = await fetchJson("/api/auth/me");
    const cloud = me.mode === "cloud";
    setIsCloud(cloud);
    if (!cloud) return;

    const extras: Cmd[] = [];
    const boards = await fetchJson("/api/boards");
    for (const b of boards.boards ?? [])
      extras.push({ id: `board-${b.id}`, label: b.name, hint: "Board", icon: ChartBar, run: () => go(`/boards/${b.id}`) });
    const ws = await fetchJson("/api/workspaces");
    for (const w of ws.workspaces ?? [])
      extras.push({
        id: `ws-${w.id}`,
        label: w.name,
        hint: "Switch workspace",
        icon: UsersThree,
        run: async () => {
          setOpen(false);
          await fetch("/api/workspaces/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId: w.id }),
          });
          window.location.reload();
        },
      });
    setDynamic([...connCmds, ...extras]);
  }, [go]);

  const allCmds = useMemo(
    () => [...dynamic, ...staticCmds],
    [dynamic, staticCmds]
  );

  // Global ⌘K / Ctrl+K toggle, plus a custom event for the clickable nav hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("irs:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("irs:cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <QuickOpen
      open={open}
      onClose={() => setOpen(false)}
      items={allCmds}
      limit={40}
      placeholder="Search connections, boards, actions…"
      getKey={(c) => c.id}
      getSearchText={(c) => c.label}
      onPick={(c) => c.run()}
      renderRow={(c, { active }) => {
        const RowIcon = c.icon;
        return (
          <div
            className={
              "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm " +
              (active
                ? "bg-[#FFEB02]/15"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800")
            }
          >
            <RowIcon size={16} className="shrink-0 text-neutral-500" />
            <span className="flex-1 truncate">{c.label}</span>
            <span className="shrink-0 text-xs text-neutral-400">{c.hint}</span>
          </div>
        );
      }}
    />
  );
}

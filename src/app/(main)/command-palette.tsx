"use client";

import {
  ChartBar,
  Clock,
  Database,
  Gear,
  type Icon,
  MagnifyingGlass,
  PlugsConnected,
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
 * app shell; a global key handler toggles it.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [dynamic, setDynamic] = useState<Cmd[]>([]);
  const [isCloud, setIsCloud] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
      { id: "nav-local", label: "All connections", hint: "Go to", icon: Database, run: () => go("/local") },
      { id: "nav-new", label: "New connection", hint: "Go to", icon: Plus, run: () => go("/connections/new") },
      { id: "nav-conns", label: "Connections", hint: "Settings", icon: PlugsConnected, run: () => go("/connections") },
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

  // Lazy-load connections, boards, workspaces the first time the palette opens.
  const load = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    const me = await fetchJson("/api/auth/me");
    const cloud = me.mode === "cloud";
    setIsCloud(cloud);
    const cmds: Cmd[] = [];
    const db = await fetchJson("/api/db");
    for (const c of db.connections ?? [])
      cmds.push({ id: `conn-${c.id}`, label: c.name, hint: c.driver ?? "Connection", icon: Database, run: () => go(`/vault/${c.id}`) });
    if (cloud) {
      const boards = await fetchJson("/api/boards");
      for (const b of boards.boards ?? [])
        cmds.push({ id: `board-${b.id}`, label: b.name, hint: "Board", icon: ChartBar, run: () => go(`/boards/${b.id}`) });
      const ws = await fetchJson("/api/workspaces");
      for (const w of ws.workspaces ?? [])
        cmds.push({
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
    }
    setDynamic(cmds);
  }, [go]);

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
    if (open) {
      load();
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, load]);

  // Subsequence fuzzy match; rank exact/prefix/substring above scattered.
  const results = useMemo(() => {
    const all = [...dynamic, ...staticCmds];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 40);
    const score = (label: string): number => {
      const l = label.toLowerCase();
      if (l === q) return 0;
      if (l.startsWith(q)) return 1;
      const idx = l.indexOf(q);
      if (idx >= 0) return 2 + idx / 100;
      // subsequence
      let i = 0;
      for (const ch of l) if (ch === q[i]) i++;
      return i === q.length ? 5 : Infinity;
    };
    return all
      .map((c) => ({ c, s: score(c.label) }))
      .filter((x) => x.s !== Infinity)
      .sort((a, b) => a.s - b.s)
      .slice(0, 40)
      .map((x) => x.c);
  }, [query, dynamic, staticCmds]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-3 dark:border-neutral-800">
          <MagnifyingGlass size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); results[active]?.run(); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search connections, boards, actions…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-neutral-700">esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-neutral-400">No matches.</div>
          )}
          {results.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => c.run()}
                className={
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm " +
                  (i === active ? "bg-[#FFEB02]/15" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")
                }
              >
                <Icon size={16} className="shrink-0 text-neutral-500" />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span className="shrink-0 text-[11px] text-neutral-400">{c.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import EnvBadge from "@/components/orbit/env-badge";
import IconButton from "@/components/orbit/icon-button";
import Kbd from "@/components/ui/kbd";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { scc } from "@/core/command";
import { SavedDocData } from "@/drivers/saved-doc/saved-doc-driver";
import { bumpTable, frecencyScores } from "@/lib/table-frecency";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, Ellipsis, Search, SquareTerminal, Table } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactElement, useEffect, useMemo, useState } from "react";
import ThemeToggle from "../theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SchemaView from "./schema-sidebar";

export interface SidebarPanel {
  key: string;
  icon: ReactElement;
  name: string;
  content?: ReactElement;
  onClick?: () => void;
}

/**
 * The unified studio sidebar (the mock's shell): one column — connection
 * header with env badge, a ⌘K jump affordance, and the schema tree as the
 * permanent body. Secondary panels (Databases, Queries, Tools, extensions)
 * swap the body via quiet header icons instead of a dedicated icon rail.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-6 items-center px-2 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {children}
    </div>
  );
}

export default function StudioSidebar({
  panels,
}: Readonly<{ panels: SidebarPanel[] }>) {
  const { name, environment, onBack, docDriver } = useStudioContext();
  const { schema } = useSchema();
  const pathname = usePathname();
  const { forcedTheme } = useTheme();
  const searchParams = useSearchParams();

  // RECENT — the frecency top of this connection's tables, resolved against
  // the live schema so renamed/dropped tables fall out naturally.
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => setScores(frecencyScores(pathname)), [pathname]);
  const recent = useMemo(() => {
    const items = Object.values(schema)
      .flat()
      .filter((i) => i.type === "table" || i.type === "view");
    return items
      .filter((i) => (scores[i.name] ?? 0) > 0)
      .sort((a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0))
      .slice(0, 4);
  }, [schema, scores]);

  // SAVED QUERIES — most recently updated, live via the doc driver's listener.
  const [savedDocs, setSavedDocs] = useState<SavedDocData[]>([]);
  useEffect(() => {
    if (!docDriver) return;
    const load = () =>
      docDriver
        .getDocs()
        .then((groups) =>
          setSavedDocs(
            groups
              .flatMap((g) => g.docs)
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 5)
          )
        )
        .catch(() => {});
    load();
    docDriver.addChangeListener(load);
    return () => docDriver.removeChangeListener(load);
  }, [docDriver]);

  // Identity footer (cloud/linked shows the account; desktop shows the vault).
  const [meEmail, setMeEmail] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setMeEmail(j?.email ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Honor the old ?sidebar=<key> deep link for the swappable panels.
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const k = searchParams.get("sidebar");
    return k && panels.some((p) => p.key === k && p.content) ? k : null;
  });
  const active = panels.find((p) => p.key === activeKey);

  const disableToggle =
    searchParams.get("disableThemeToggle") === "1" || forcedTheme;

  const togglePanel = (p: SidebarPanel) => {
    if (p.onClick) return p.onClick();
    const next = activeKey === p.key ? null : p.key;
    setActiveKey(next);
    try {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("sidebar", next);
      else url.searchParams.delete("sidebar");
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      {/* Connection header */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2.5 pb-1">
        {onBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton size="sm" onClick={onBack} aria-label="Back to home">
                <ChevronLeft />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to home</TooltipContent>
          </Tooltip>
        )}
        <span className="min-w-0 truncate px-0.5 text-[13px] font-medium text-foreground">
          {name}
        </span>
        <EnvBadge environment={environment} />
        <span className="flex-1" />
        {panels.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <IconButton
                size="sm"
                onClick={() => togglePanel(p)}
                toggled={activeKey === p.key}
                aria-label={p.name}
              >
                {p.icon}
              </IconButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">{p.name}</TooltipContent>
          </Tooltip>
        ))}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <IconButton size="sm" aria-label="More">
              <Ellipsis />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            {!disableToggle && (
              <div className="flex p-2">
                <ThemeToggle />
              </div>
            )}
            {onBack && (
              <DropdownMenuItem onClick={onBack}>
                <ArrowLeft className="mr-2" />
                Back to home
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem inset>
              <Link
                className="block w-full"
                href="https://github.com/your-moon/inner-ring-studio/issues"
                target="_blank"
              >
                Report issues
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem inset disabled>
              v{process.env.NEXT_PUBLIC_STUDIO_VERSION}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Jump affordance — same surface the ⌘K shortcut opens. */}
      <button
        onClick={() => window.dispatchEvent(new Event("irs:studio-cmdk"))}
        className="u-smooth mx-2 mt-1 mb-1 flex h-[30px] shrink-0 items-center gap-2 rounded-[7px] border border-border bg-background px-2.5 text-left text-[13px] text-muted-foreground hover:border-ring/40"
      >
        <Search size={13} className="shrink-0" />
        <span className="flex-1">Jump to…</span>
        <Kbd>
          {typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("mac")
            ? "⌘K"
            : "Ctrl K"}
        </Kbd>
      </button>

      {/* Body: recent + schema tree + saved queries, or the active panel. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            active?.content && "hidden"
          )}
        >
          {recent.length > 0 && (
            <div className="shrink-0 px-2 pt-2">
              <SectionLabel>Recent</SectionLabel>
              {recent.map((t) => (
                <button
                  key={`${t.schemaName}.${t.name}`}
                  onClick={() => {
                    bumpTable(pathname, t.name);
                    setScores(frecencyScores(pathname));
                    scc.tabs.openBuiltinTable({
                      schemaName: t.schemaName ?? "",
                      tableName: t.name,
                    });
                  }}
                  className="u-smooth flex h-[26px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-secondary-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Table size={12} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            <SchemaView />
          </div>

          {savedDocs.length > 0 && (
            <div className="shrink-0 border-t border-border/60 px-2 pt-1.5 pb-2">
              <SectionLabel>Saved queries</SectionLabel>
              {savedDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() =>
                    scc.tabs.openBuiltinQuery({
                      name: d.name,
                      saved: {
                        key: d.id,
                        sql: d.content,
                        namespaceName: d.namespace.name,
                      },
                    })
                  }
                  className="u-smooth flex h-[26px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-secondary-foreground hover:bg-secondary hover:text-foreground"
                >
                  <SquareTerminal
                    size={12}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {active?.content && (
          <div
            key={active.key}
            className="flex h-full animate-in duration-150 fade-in-0 slide-in-from-left-1"
          >
            {active.content}
          </div>
        )}
      </div>

      {/* Identity footer — the shell's bottom anchor (account, or the local vault). */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 px-3 py-2">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #5e6ad2, #8a7bff)" }}
        >
          {(meEmail ?? "LV").slice(0, 2).toUpperCase()}
        </span>
        <span className="truncate text-[12.5px] text-secondary-foreground">
          {meEmail ?? "Local vault"}
        </span>
      </div>
    </div>
  );
}

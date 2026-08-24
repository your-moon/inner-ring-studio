"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  builtinOpenQueryTab,
  ensureQueryCounterAtLeast,
} from "@/core/builtin-tab/open-query-tab";
import {
  nextQueryCounter,
  queryRestoreArgs,
  serializeQueryTabs,
} from "@/core/tab-restore";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StudioSidebar, { SidebarPanel } from "./studio-sidebar";
import ToolSidebar from "./sidebar/tools-sidebar";
import WindowTabs, {
  TabRestoreDescriptor,
  WindowTabItemProps,
} from "./windows-tab";

import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { scc } from "@/core/command";
import {
  tabCloseChannel,
  tabOpenChannel,
  tabReplaceChannel,
} from "@/core/extension-tab";
import { normalizedPathname, sendAnalyticEvents } from "@/lib/tracking";
import { bumpTable } from "@/lib/table-frecency";
import { cn } from "@/lib/utils";
import { Binoculars, GearSix, StackSimple } from "@phosphor-icons/react";
import EnvBadge from "../orbit/env-badge";
import useSWR from "swr";
import ConnectionsSidebar from "./sidebar/connections-sidebar";
import SavedDocTab from "./sidebar/saved-doc-tab";
import StudioPalette from "./studio-palette";

/**
 * The tab set to start with: restore the query tabs from the previous session
 * for this connection, or fall back to a single default query tab. Runs once
 * per mount (SSR-safe). Non-query tabs are not persisted, so they don't return.
 */
function buildInitialTabs(restoreKey: string): {
  tabs: WindowTabItemProps[];
  selected: number;
} {
  const fallback = (): WindowTabItemProps[] => [
    builtinOpenQueryTab.generate({ restoreId: "default", name: "Query" }),
  ];

  if (typeof window === "undefined") return { tabs: fallback(), selected: 0 };

  const resumeKey = restoreKey.replace("pmsql.tabs:", "pmsql.resume.query:");
  const resumedSql = window.sessionStorage.getItem(resumeKey);
  if (resumedSql !== null) window.sessionStorage.removeItem(resumeKey);

  const withResumedQuery = (tabs: WindowTabItemProps[], selected: number) => {
    if (!resumedSql) return { tabs, selected };
    const resumed = builtinOpenQueryTab.generate({ initialCode: resumedSql });
    return { tabs: [...tabs, resumed], selected: tabs.length };
  };

  try {
    const raw = window.localStorage.getItem(restoreKey);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        descriptors?: TabRestoreDescriptor[];
        selectedKey?: string;
      };
      const descriptors = parsed.descriptors ?? [];
      const restored = descriptors.map((d) =>
        builtinOpenQueryTab.generate(queryRestoreArgs(d))
      );
      if (restored.length > 0) {
        ensureQueryCounterAtLeast(nextQueryCounter(descriptors));
        const idx = restored.findIndex((t) => t.key === parsed.selectedKey);
        return withResumedQuery(restored, idx < 0 ? 0 : idx);
      }
    }
  } catch {
    /* ignore malformed persistence — fall back to the default tab */
  }

  return resumedSql
    ? withResumedQuery([], 0)
    : { tabs: fallback(), selected: 0 };
}

export default function DatabaseGui() {
  const DEFAULT_WIDTH = 300;
  const pathname = usePathname();
  // Open tabs persist per connection (pathname carries the connection id).
  const restoreKey = `pmsql.tabs:${pathname}`;

  const [defaultWidthPercentage, setDefaultWidthPercentage] = useState(25);

  useEffect(() => {
    setDefaultWidthPercentage((DEFAULT_WIDTH / window.innerWidth) * 100);
  }, []);

  const { databaseDriver, docDriver, extensions, containerClassName, name, environment } =
    useStudioContext();

  // The studio's ⌘K palette (tables + actions).
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Keep the /api/db poll alive for the whole studio session. It is not just a
  // read: the endpoint piggybacks the throttled git-vault background pull, and
  // this used to depend on the Databases sidebar tab happening to be mounted.
  useSWR(
    "/api/db",
    (u: string) => fetch(u).then((r) => r.json()),
    { refreshInterval: 5000 }
  );

  // Restore the previous session's tabs (or a default) exactly once per mount.
  const initialRef = useRef<ReturnType<typeof buildInitialTabs> | null>(null);
  if (initialRef.current === null) {
    initialRef.current = buildInitialTabs(restoreKey);
  }

  const [selectedTabIndex, setSelectedTabIndex] = useState(
    initialRef.current.selected
  );
  const { currentSchemaName, schema } = useSchema();
  const [tabs, setTabs] = useState<WindowTabItemProps[]>(
    initialRef.current.tabs
  );

  // Home can hand off a recent table without putting internal state in the
  // URL. Resolve its schema after introspection finishes, then open it once.
  const resumeTableRef = useRef<string | null | undefined>(undefined);
  if (resumeTableRef.current === undefined && typeof window !== "undefined") {
    const key = `pmsql.resume.table:${pathname}`;
    resumeTableRef.current = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
  }
  const openTabInternal = useCallback((tabOption: WindowTabItemProps) => {
    setTabs((prev) => {
      const foundIndex = prev.findIndex(
        (tab) => tab.identifier === tabOption.key
      );

      if (foundIndex >= 0) {
        setSelectedTabIndex(foundIndex);
        return prev;
      }
      setSelectedTabIndex(prev.length);

      return [...prev, tabOption];
    });
  }, []);

  const replaceTabInternal = useCallback(
    (tabOption: WindowTabItemProps) => {
      setTabs((prev) => {
        const foundIndex = prev.findIndex(
          (tab) => tab.identifier === tabOption.key
        );

        if (foundIndex >= 0) {
          setSelectedTabIndex(foundIndex);
          return prev;
        }

        return prev.map((tab, tabIndex) => {
          if (tabIndex === selectedTabIndex) {
            return tabOption;
          }
          return tab;
        });
      });
    },
    [selectedTabIndex]
  );

  const closeStudioTab = useCallback(
    (keys: string[]) => {
      if (keys) {
        setTabs((currentTabs) => {
          const selectedTab = currentTabs[selectedTabIndex];
          const newTabs = currentTabs.filter(
            (t) => !keys?.includes(t.identifier)
          );

          if (selectedTab) {
            const selectedTabNewIndex = newTabs.findIndex(
              (t) => t.identifier === selectedTab.identifier
            );
            if (selectedTabNewIndex < 0) {
              setSelectedTabIndex(
                Math.min(selectedTabIndex, newTabs.length - 1)
              );
            } else {
              setSelectedTabIndex(selectedTabNewIndex);
            }
          }

          return newTabs;
        });
      }
    },
    [selectedTabIndex]
  );

  useEffect(() => {
    return tabOpenChannel.listen(openTabInternal);
  }, [openTabInternal]);

  useEffect(() => {
    const tableName = resumeTableRef.current;
    if (!tableName) return;
    const match = Object.values(schema)
      .flat()
      .find(
        (item) =>
          item.name === tableName &&
          (item.type === "table" || item.type === "view")
      );
    if (!match) return;
    resumeTableRef.current = null;
    bumpTable(pathname, tableName);
    scc.tabs.openBuiltinTable({
      schemaName: match.schemaName ?? "",
      tableName,
    });
  }, [schema, pathname]);

  useEffect(() => {
    return tabCloseChannel.listen(closeStudioTab);
  }, [closeStudioTab]);

  useEffect(() => {
    return tabReplaceChannel.listen(replaceTabInternal);
  }, [replaceTabInternal]);

  // Persist the open query tabs (+ which one is active) so they come back on
  // the next reload. Debounced; query tabs only (see tab-restore).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(
          restoreKey,
          JSON.stringify({
            descriptors: serializeQueryTabs(tabs),
            selectedKey: tabs[selectedTabIndex]?.key,
          })
        );
      } catch {
        /* ignore quota errors */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [tabs, selectedTabIndex, restoreKey]);

  // Keyboard tab control (desktop-first). A stack of recently-closed tabs keeps
  // the live tab object so ⌘⇧T re-inserts it intact — a re-mounted query tab
  // reloads its SQL from its per-key draft, so content survives. Refs let the
  // window handler read the latest tabs/selection without re-binding.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const selectedIndexRef = useRef(selectedTabIndex);
  selectedIndexRef.current = selectedTabIndex;
  const closedTabsRef = useRef<{ tab: WindowTabItemProps; index: number }[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();

      // ⌘⇧T — reopen the last closed tab at its original position.
      if (e.shiftKey && key === "t") {
        const last = closedTabsRef.current.pop();
        if (!last) return;
        e.preventDefault();
        const at = Math.min(last.index, tabsRef.current.length);
        setTabs((prev) => [...prev.slice(0, at), last.tab, ...prev.slice(at)]);
        setSelectedTabIndex(at);
        return;
      }
      if (e.shiftKey) return;

      // ⌘K — the studio palette (jump to a table, run a command).
      if (key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      // ⌘T — new query tab.
      if (key === "t") {
        e.preventDefault();
        scc.tabs.openBuiltinQuery({});
        return;
      }

      // ⌘W — close the current tab (pushed onto the reopen stack).
      if (key === "w") {
        const idx = selectedIndexRef.current;
        const closing = tabsRef.current[idx];
        if (!closing) return;
        e.preventDefault();
        closedTabsRef.current.push({ tab: closing, index: idx });
        setTabs((prev) => prev.filter((_, i) => i !== idx));
        setSelectedTabIndex(Math.max(0, Math.min(idx, tabsRef.current.length - 2)));
        return;
      }

      // ⌘1–9 — jump to the nth tab (9 = last).
      if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key);
        const count = tabsRef.current.length;
        const target = n === 9 ? count - 1 : Math.min(n - 1, count - 1);
        if (target >= 0) {
          e.preventDefault();
          setSelectedTabIndex(target);
        }
        return;
      }
    };
    const onPaletteEvent = () => setPaletteOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("irs:studio-cmdk", onPaletteEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("irs:studio-cmdk", onPaletteEvent);
    };
  }, []);

  // Secondary sidebar panels — the schema tree is the sidebar's permanent
  // body; these swap in via quiet header icons (no more icon rail).
  const sidebarPanels = useMemo(() => {
    return [
      {
        key: "connections",
        name: "Databases",
        content: <ConnectionsSidebar />,
        icon: <StackSimple weight="light" size={24} />,
      },
      docDriver
        ? {
            key: "saved",
            name: "Queries",
            content: <SavedDocTab />,
            icon: <Binoculars weight="light" size={24} />,
          }
        : undefined,
      {
        key: "tools",
        name: "Tools",
        content: <ToolSidebar />,
        icon: <GearSix weight="light" size={24} />,
      },
      ...extensions.getSidebars(),
    ].filter(Boolean) as SidebarPanel[];
  }, [docDriver, extensions]);

  const tabSideMenu = useMemo(() => {
    return [
      {
        text: "New Query",
        onClick: () => {
          scc.tabs.openBuiltinQuery({});
        },
      },
      databaseDriver.getFlags().supportCreateUpdateTable
        ? {
            text: "New Table",
            onClick: () => {
              scc.tabs.openBuiltinSchema({ schemaName: currentSchemaName });
            },
          }
        : undefined,
    ].filter(Boolean) as { text: string; onClick: () => void }[];
  }, [currentSchemaName, databaseDriver]);

  // Send to analytic when tab changes.
  const previousLogTabKey = useRef<string>("");
  useEffect(() => {
    const currentTab = tabs[selectedTabIndex];
    if (currentTab && currentTab.key !== previousLogTabKey.current) {
      // We don't log the first tab because it's already logged in the main screen.
      if (previousLogTabKey.current) {
        sendAnalyticEvents([
          {
            name: "page_view",
            data: {
              path: normalizedPathname(window.location.pathname),
              tab: currentTab.type,
              tab_key: currentTab.key,
            },
          },
        ]);
      }

      previousLogTabKey.current = currentTab.key;
    }
  }, [tabs, selectedTabIndex, previousLogTabKey]);

  return (
    <div className={cn("flex h-screen w-screen flex-col", containerClassName)}>
      <StudioPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ResizablePanelGroup direction="horizontal" autoSaveId="pmsql.layout.sidebar">
        <ResizablePanel id="sidebar" order={1} minSize={5} defaultSize={defaultWidthPercentage}>
          <StudioSidebar panels={sidebarPanels} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="main" order={2} defaultSize={100 - defaultWidthPercentage}>
          <WindowTabs
            leading={
              <div className="flex h-[40px] shrink-0 items-center gap-1.5 pr-2 pl-3 text-[13px]">
                <span className="max-w-[180px] truncate text-muted-foreground">
                  {name}
                </span>
                <EnvBadge environment={environment} />
                <span className="text-muted-foreground/50">›</span>
              </div>
            }
            menu={tabSideMenu}
            tabs={tabs}
            selected={selectedTabIndex}
            onSelectChange={setSelectedTabIndex}
            onTabsChange={setTabs}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

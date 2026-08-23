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
import SchemaView from "./schema-sidebar";
import SidebarTab, { SidebarTabItem } from "./sidebar-tab";
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
import { cn } from "@/lib/utils";
import { Binoculars, GearSix, StackSimple, Table } from "@phosphor-icons/react";
import ConnectionsSidebar from "./sidebar/connections-sidebar";
import SavedDocTab from "./sidebar/saved-doc-tab";

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
        return { tabs: restored, selected: idx < 0 ? 0 : idx };
      }
    }
  } catch {
    /* ignore malformed persistence — fall back to the default tab */
  }

  return { tabs: fallback(), selected: 0 };
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

  const { databaseDriver, docDriver, extensions, containerClassName } =
    useStudioContext();

  // Restore the previous session's tabs (or a default) exactly once per mount.
  const initialRef = useRef<ReturnType<typeof buildInitialTabs> | null>(null);
  if (initialRef.current === null) {
    initialRef.current = buildInitialTabs(restoreKey);
  }

  const [selectedTabIndex, setSelectedTabIndex] = useState(
    initialRef.current.selected
  );
  const { currentSchemaName } = useSchema();
  const [tabs, setTabs] = useState<WindowTabItemProps[]>(
    initialRef.current.tabs
  );

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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebarTabs = useMemo(() => {
    // Schema (the tables) leads — opening a connection should show what's in it,
    // not a collapsed connection switcher. Databases/Queries/Tools follow.
    return [
      {
        key: "database",
        name: "Schema",
        content: <SchemaView />,
        icon: <Table weight="light" size={24} />,
      },
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
    ].filter(Boolean) as SidebarTabItem[];
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
      <ResizablePanelGroup direction="horizontal" autoSaveId="pmsql.layout.sidebar">
        <ResizablePanel id="sidebar" order={1} minSize={5} defaultSize={defaultWidthPercentage}>
          <SidebarTab tabs={sidebarTabs} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="main" order={2} defaultSize={100 - defaultWidthPercentage}>
          <WindowTabs
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

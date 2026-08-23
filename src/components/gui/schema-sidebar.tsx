import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { scc } from "@/core/command";
import { StudioExtensionMenuItem } from "@/core/extension-manager";
import { cn } from "@/lib/utils";
import { Plus } from "@phosphor-icons/react";
import {
  LucideLoader2,
  LucideRefreshCw,
  LucideSearch,
} from "lucide-react";
import { useMemo, useState } from "react";
import { buttonVariants } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import SchemaCreateDialog from "./schema-editor/schema-create";
import SchemaList, { TableSortMode } from "./schema-sidebar-list";

export default function SchemaView() {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<TableSortMode>(() => {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem("pmsql.tableSort");
      if (v) return v as TableSortMode;
    }
    return "name-asc";
  });
  const changeSort = (m: TableSortMode) => {
    setSortMode(m);
    try {
      window.localStorage.setItem("pmsql.tableSort", m);
    } catch {
      /* ignore */
    }
  };
  const { databaseDriver, extensions } = useStudioContext();
  const { currentSchemaName, loading, error, refresh } = useSchema();
  const [isCreateSchema, setIsCreateSchema] = useState(false);

  const contentMenu = useMemo(() => {
    const items: StudioExtensionMenuItem[] = [];

    const flags = databaseDriver.getFlags();

    if (flags.supportCreateUpdateTable) {
      items.push({
        title: "Create Table",
        key: "create-table",
        onClick: () => {
          scc.tabs.openBuiltinSchema({ schemaName: currentSchemaName });
        },
      });
    }

    if (flags.supportCreateUpdateDatabase) {
      items.push({
        title: "Create Database/Schema",
        key: "create-schema",
        onClick: () => {
          setIsCreateSchema(true);
        },
      });
    }

    return [...items, ...extensions.getResourceCreateMenu()];
  }, [databaseDriver, currentSchemaName, extensions]);

  const activatorButton = useMemo(() => {
    if (contentMenu.length === 0) return null;

    if (contentMenu.length === 1) {
      return (
        <button
          className={cn(
            buttonVariants({
              size: "icon",
            }),
            // A quiet icon button, not a floating action button — neither
            // reference app ever floats a filled circle over content.
            "h-7 w-7 rounded-md bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          onClick={contentMenu[0].onClick}
        >
          <Plus size={16} weight="bold" />
        </button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              buttonVariants({
                size: "icon",
              }),
              "h-7 w-7 rounded-md bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Plus size={16} weight="bold" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start">
          {contentMenu.map((menu) => {
            return (
              <DropdownMenuItem key={menu.title} onClick={menu.onClick}>
                {menu.title}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [contentMenu]);
  return (
    <div className="flex grow flex-col overflow-hidden">
      {isCreateSchema && (
        <SchemaCreateDialog
          onClose={() => {
            setIsCreateSchema(false);
          }}
        />
      )}

      <div className="flex flex-col p-4 pb-2">
        <div className="mb-5 flex items-center justify-between">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <h1 className="cursor-context-menu text-[15px] font-semibold text-foreground">
                Tables
              </h1>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => changeSort("name-asc")}>
                Sort by name (A → Z)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => changeSort("name-desc")}>
                Sort by name (Z → A)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => changeSort("size-desc")}>
                Sort by size (largest first)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => changeSort("size-asc")}>
                Sort by size (smallest first)
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {activatorButton}
        </div>

        <div className="u-smooth flex h-8 w-full cursor-text items-center gap-2 overflow-hidden rounded-md border border-input bg-card px-2.5 text-foreground focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
          <LucideSearch
            className="shrink-0 text-muted-foreground"
            style={{ width: 14, height: 14 }}
          />
          <input
            type="text"
            className="h-full flex-1 grow bg-transparent text-[13px] outline-hidden placeholder:text-muted-foreground"
            value={search}
            placeholder="Search tables"
            onChange={(e) => {
              setSearch(e.currentTarget.value);
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="mx-4 mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/30">
            <div className="mb-1 font-medium text-red-700 dark:text-red-400">
              Couldn&apos;t load tables
            </div>
            <pre className="mb-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-red-600/90 dark:text-red-400/80">
              {error}
            </pre>
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
            >
              <LucideRefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <LucideLoader2 className="h-4 w-4 animate-spin" />
            Loading tables…
          </div>
        ) : (
          <SchemaList search={search} sortMode={sortMode} />
        )}
      </div>
    </div>
  );
}

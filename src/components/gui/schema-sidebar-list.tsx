import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { OpenContextMenuList } from "@/core/channel-builtin";
import { scc } from "@/core/command";
import { DatabaseSchemaItem } from "@/drivers/base-driver";
import { triggerEditorExtensionTab } from "@/extensions/trigger-editor";
import { ExportFormat, exportTableData } from "@/lib/export-helper";
import { bumpTable, frecencyScores } from "@/lib/table-frecency";
import { LucideCog, LucideDatabase, LucideIcon, LucideView, Table } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListView, ListViewItem } from "../listview";
import { CloudflareIcon } from "../resource-card/icon";
import SchemaCreateDialog from "./schema-editor/schema-create";

interface SchemaListProps {
  search: string;
  sortMode?: TableSortMode;
}

function formatTableSize(byteCount?: number) {
  const byteInKb = 1024;
  const byteInMb = byteInKb * 1024;
  const byteInGb = byteInMb * 1024;

  if (!byteCount) return undefined;
  if (byteInMb * 999 < byteCount)
    return (byteCount / byteInGb).toFixed(1) + " GB";
  if (byteInMb * 100 < byteCount)
    return (byteCount / byteInMb).toFixed(0) + " MB";
  if (byteInKb * 100 < byteCount)
    return (byteCount / byteInMb).toFixed(1) + " MB";
  if (byteInKb < byteCount) return Math.floor(byteCount / byteInKb) + " KB";
  return "1 KB";
}

function prepareListViewItem(
  schema: DatabaseSchemaItem[],
  maxTableSize: number
): ListViewItem<DatabaseSchemaItem>[] {
  return schema.map((s) => {
    let icon = Table;
    let iconClassName = "";

    if (s.type === "trigger") {
      icon = LucideCog;
      iconClassName = "text-purple-500";
    } else if (s.type === "view") {
      icon = LucideView;
      iconClassName = "text-green-600 dark:text-green-300";
    } else if (s.type === "table" && s.name === "_cf_KV") {
      icon = CloudflareIcon as LucideIcon;
      iconClassName = "text-orange-500";
    }

    return {
      data: s,
      icon: icon,
      iconColor: iconClassName,
      key: s.schemaName + "." + s.name,
      name: s.name,
      progressBarMax: maxTableSize,
      progressBarValue: s.tableSchema?.stats?.sizeInByte,
      progressBarLabel: formatTableSize(s.tableSchema?.stats?.sizeInByte),
    };
  });
}

function groupTriggerByTable(
  items: ListViewItem<DatabaseSchemaItem>[]
): ListViewItem<DatabaseSchemaItem>[] {
  // Find all triggers
  const triggers = items.filter((item) => item.data.type === "trigger");
  const triggerByTable = triggers.reduce(
    (a, b) => {
      a[b.data.tableName ?? ""] = [...(a[b.data.tableName ?? ""] ?? []), b];
      return a;
    },
    {} as Record<string, ListViewItem<DatabaseSchemaItem>[]>
  );

  const list = items.filter((item) => item.data.type !== "trigger");
  for (const item of list) {
    if (item.data.type === "table" && triggerByTable[item.data.name]) {
      item.children = [
        ...(item.children ?? []),
        ...(triggerByTable[item.name] ?? []),
      ];
    }
  }

  return list;
}

function groupByFtsTable(items: ListViewItem<DatabaseSchemaItem>[]) {
  const hash = items.reduce(
    (a, b) => {
      a[b.name] = b;
      return a;
    },
    {} as Record<string, ListViewItem<DatabaseSchemaItem>>
  );
  const ftsSuffix = ["_config", "_content", "_data", "_docsize", "_idx"];
  const excludes = new Set();

  for (const item of items) {
    if (item.data.tableSchema?.fts5) {
      item.children = ftsSuffix
        .map((suffix) => hash[item.data.name + suffix])
        .filter(Boolean);

      ftsSuffix.forEach((suffix) => excludes.add(item.data.name + suffix));

      item.badgeContent = "fts5";
    }
  }

  return items.filter((item) => !excludes.has(item.data.name));
}

export type TableSortMode =
  | "frecency"
  | "name-asc"
  | "name-desc"
  | "size-asc"
  | "size-desc";

function sortTable(
  items: ListViewItem<DatabaseSchemaItem>[],
  mode: TableSortMode = "name-asc",
  scores: Record<string, number> = {}
) {
  const size = (x: ListViewItem<DatabaseSchemaItem>) =>
    x.data?.tableSchema?.stats?.sizeInByte ?? -1;
  return [...items].sort((a, b) => {
    switch (mode) {
      case "frecency": {
        // Most-used first; tables never opened (score 0) fall back to A→Z.
        const diff = (scores[b.name] ?? 0) - (scores[a.name] ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "size-asc":
        return size(a) - size(b);
      case "size-desc":
        return size(b) - size(a);
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

function flattenSchemaGroup(
  schemaGroup: ListViewItem<DatabaseSchemaItem>[]
): ListViewItem<DatabaseSchemaItem>[] {
  if (schemaGroup.length === 1) return schemaGroup[0].children ?? [];
  return schemaGroup;
}

// Copy of export-result-button.tsx
async function downloadExportTable(
  format: string,
  handler: Promise<string | Blob>
) {
  try {
    if (!format) return;
    const content = await handler;
    if (!content) return;
    // TODO: more mimeTypes support
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export.${format === "delimited" ? "csv" : format === "markdown" ? "md" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Failed to download exported ${format} file:`, error);
  }
}

export default function SchemaList({
  search,
  sortMode: initialSortMode = "frecency",
}: Readonly<SchemaListProps>) {
  const { databaseDriver, extensions } = useStudioContext();
  const [selected, setSelected] = useState("");
  const { refresh, schema, currentSchemaName } = useSchema();
  const [editSchema, setEditSchema] = useState<string | null>(null);
  const pathname = usePathname();

  // Table sort order, remembered per connection (right-click a schema to change).
  const sortKey = `pmsql.schemaSort:${pathname}`;
  const [sortMode, setSortMode] = useState<TableSortMode>(() => {
    if (typeof window === "undefined") return initialSortMode;
    return (
      (window.localStorage.getItem(sortKey) as TableSortMode) || initialSortMode
    );
  });

  // Frecency scores (zoxide-style) for the "Most used" default sort. Bumped when
  // a table is opened; kept in state so re-sorting is instant.
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    setScores(frecencyScores(pathname));
  }, [pathname]);
  const changeSort = useCallback(
    (m: TableSortMode) => {
      setSortMode(m);
      try {
        window.localStorage.setItem(sortKey, m);
      } catch {
        /* ignore */
      }
    },
    [sortKey]
  );

  // Persist the expanded/collapsed state of the DB tree per connection so it
  // survives reloads (DBeaver-like navigator behavior). `null` means this
  // connection has no saved tree state yet: we render the all-expanded default
  // (tables visible the moment the connection opens) and only start persisting
  // once the user actually toggles something — so a reload before the schema
  // ever loaded can't freeze an empty tree into storage.
  const collapseKey = `pmsql.schemaCollapsed:${pathname}`;
  const readCollapsed = useCallback((): Set<string> | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(collapseKey);
      if (raw) return new Set<string>(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    return null;
  }, [collapseKey]);
  const [collapsed, setCollapsed] = useState<Set<string> | null>(readCollapsed);

  // This component instance survives switching connections (router.push between
  // /vault/<id> pages re-renders it with a new pathname) — re-read the new
  // connection's saved state instead of carrying the previous one across.
  useEffect(() => setCollapsed(readCollapsed()), [readCollapsed]);

  useEffect(() => {
    if (collapsed === null || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(collapseKey, JSON.stringify([...collapsed]));
    } catch {
      /* ignore */
    }
  }, [collapsed, collapseKey]);

  useEffect(() => {
    setSelected("");
  }, [setSelected, search]);

  const exportFormats = useMemo(() => {
    return [
      { title: "Export as CSV", format: "csv" },
      { title: "Export as Excel", format: "xlsx" },
      { title: "Export as JSON", format: "json" },
      { title: "Export as SQL INSERT", format: "sql" },
      { title: "Export as Markdown", format: "markdown" },
    ];
  }, []);

  const prepareContextMenu = useCallback(
    (item?: DatabaseSchemaItem) => {
      const selectedName = item?.name;
      const isTable = item?.type === "table";
      const schemaName = item?.schemaName ?? currentSchemaName;

      const createMenuSection = {
        title: "Create",
        sub: [
          databaseDriver.getFlags().supportCreateUpdateTable && {
            title: "Create Table",
            onClick: () => {
              scc.tabs.openBuiltinSchema({
                schemaName: item?.schemaName ?? currentSchemaName,
              });
            },
          },
          ...extensions.getResourceCreateMenu(),
        ].filter(Boolean),
      };

      const modificationSection = item
        ? [
            isTable && databaseDriver.getFlags().supportCreateUpdateTable
              ? {
                  title: "Edit Table",
                  onClick: () => {
                    scc.tabs.openBuiltinSchema({
                      schemaName: item?.schemaName ?? currentSchemaName,
                      tableName: item?.name,
                    });
                  },
                }
              : undefined,
            ...extensions.getResourceContextMenu(item, "modification"),
          ].filter(Boolean)
        : [];

      const exportSection =
        isTable && selectedName
          ? {
              title: "Export Table",
              sub: exportFormats.map(({ title, format }) => ({
                title,
                onClick: async () => {
                  const handler = exportTableData(
                    databaseDriver,
                    schemaName,
                    selectedName,
                    format as ExportFormat,
                    "file"
                  );
                  downloadExportTable(format, handler);
                },
              })),
            }
          : undefined;

      return [
        createMenuSection,
        {
          title: "Copy Name",
          disabled: !selectedName,
          onClick: () => {
            window.navigator.clipboard.writeText(selectedName ?? "");
          },
        },
        { separator: true },

        // Export Section
        exportSection,
        // Modification Section
        ...modificationSection,
        modificationSection.length > 0 ? { separator: true } : undefined,

        {
          title: "Sort tables",
          sub: [
            { title: (sortMode === "frecency" ? "✓ " : "") + "Most used", onClick: () => changeSort("frecency") },
            { title: (sortMode === "name-asc" ? "✓ " : "") + "Name (A → Z)", onClick: () => changeSort("name-asc") },
            { title: (sortMode === "name-desc" ? "✓ " : "") + "Name (Z → A)", onClick: () => changeSort("name-desc") },
            { title: (sortMode === "size-desc" ? "✓ " : "") + "Size (largest first)", onClick: () => changeSort("size-desc") },
            { title: (sortMode === "size-asc" ? "✓ " : "") + "Size (smallest first)", onClick: () => changeSort("size-asc") },
          ],
        },
        { separator: true },
        { title: "Refresh", onClick: () => refresh() },
      ].filter(Boolean) as OpenContextMenuList;
    },
    [refresh, databaseDriver, currentSchemaName, extensions, exportFormats, sortMode, changeSort]
  );

  const listViewItems = useMemo(() => {
    const r = sortTable(
      Object.entries(schema).map(([s, tables]) => {
        const maxTableSize = Math.max(
          ...tables.map((t) => t.tableSchema?.stats?.sizeInByte ?? 0)
        );

        return {
          data: { type: "schema", schemaName: s },
          icon: LucideDatabase,
          name: s,
          iconBadgeColor: s === currentSchemaName ? "bg-green-600" : undefined,
          key: s.toString(),
          children: sortTable(
            groupByFtsTable(
              groupTriggerByTable(prepareListViewItem(tables, maxTableSize))
            ),
            sortMode,
            scores
          ),
        } as ListViewItem<DatabaseSchemaItem>;
      }),
      sortMode,
      scores
    );

    if (databaseDriver.getFlags().optionalSchema) {
      // For SQLite, the default schema is main and
      // it is optional.
      return flattenSchemaGroup(r);
    }
    return r;
  }, [schema, currentSchemaName, databaseDriver, sortMode, scores]);

  // Every key in the tree — used to force-expand while searching (the ListView's
  // "collapsedKeys" set is actually the set of EXPANDED keys; see its renderer).
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    const walk = (items: ListViewItem<DatabaseSchemaItem>[]) =>
      items.forEach((i) => {
        keys.add(i.key);
        if (i.children) walk(i.children as ListViewItem<DatabaseSchemaItem>[]);
      });
    walk(listViewItems);
    return keys;
  }, [listViewItems]);

  // The all-expanded default for a connection with no saved tree state: schema
  // nodes only. On flattened (schema-less) trees the top level is the tables
  // themselves, and force-expanding them would unfold trigger/FTS shadow groups.
  const defaultExpanded = useMemo(
    () =>
      new Set(
        listViewItems
          .filter((i) => i.data.type === "schema")
          .map((i) => i.key)
      ),
    [listViewItems]
  );

  const filterCallback = useCallback(
    (item: ListViewItem<DatabaseSchemaItem>) => {
      if (!search) return true;
      return item.name.toLowerCase().indexOf(search.toLowerCase()) >= 0;
    },
    [search]
  );

  // key -> item, so a single click (which gives us only the key) can resolve
  // the item and open it.
  const byKey = useMemo(() => {
    const m = new Map<string, ListViewItem<DatabaseSchemaItem>>();
    const walk = (items: ListViewItem<DatabaseSchemaItem>[]) =>
      items.forEach((i) => {
        m.set(i.key, i);
        if (i.children) walk(i.children as ListViewItem<DatabaseSchemaItem>[]);
      });
    walk(listViewItems);
    return m;
  }, [listViewItems]);

  // Open a schema item: a table/view opens its data tab, a trigger its editor,
  // a schema switches the active database.
  const openItem = useCallback(
    (item: ListViewItem<DatabaseSchemaItem>) => {
      if (item.data.type === "table" || item.data.type === "view") {
        bumpTable(pathname, item.data.name);
        setScores(frecencyScores(pathname));
        scc.tabs.openBuiltinTable({
          schemaName: item.data.schemaName ?? "",
          tableName: item.data.name,
        });
      } else if (item.data.type === "trigger") {
        triggerEditorExtensionTab.open({
          schemaName: item.data.schemaName ?? "",
          name: item.name ?? "",
          tableName: item.data.tableName ?? "",
        });
      } else if (item.data.type === "schema") {
        if (databaseDriver.getFlags().supportUseStatement) {
          const dialect = databaseDriver.getFlags().dialect;
          const switch_keyword =
            dialect === "postgres" ? "SET search_path TO " : "USE ";
          const name = [databaseDriver.escapeId(item.name)];
          if (dialect === "postgres") {
            name.push(databaseDriver.escapeId("$user"));
            if (item.name !== "public") {
              name.push(databaseDriver.escapeId("public"));
            }
          }
          databaseDriver.query(switch_keyword + name.join(",")).then(() => {
            refresh();
          });
        }
      }
    },
    [pathname, databaseDriver, refresh]
  );

  return (
    <>
      {editSchema && (
        <SchemaCreateDialog
          schemaName={editSchema}
          onClose={() => setEditSchema(null)}
        />
      )}
      <ListView
        full
        filter={filterCallback}
        highlight={search}
        items={listViewItems}
        // While searching, expand everything so matches inside a collapsed
        // schema are actually visible; restore the user's state after.
        collapsedKeys={search ? allKeys : (collapsed ?? defaultExpanded)}
        onCollapsedChange={(keys) => {
          // While searching, the tree is force-expanded (allKeys) — a toggle in
          // that state must not overwrite the user's real saved tree.
          if (!search) setCollapsed(keys);
        }}
        onContextMenu={(item) => prepareContextMenu(item?.data)}
        selectedKey={selected}
        onSelectChange={(key) => {
          setSelected(key);
          // Single click opens a table/view immediately (the tab opener dedupes,
          // so re-clicking just focuses it). Schemas/triggers stay double-click
          // so a stray click doesn't switch the active database.
          const item = byKey.get(key);
          if (item && (item.data.type === "table" || item.data.type === "view")) {
            openItem(item);
          }
        }}
        onDoubleClick={openItem}
      />
    </>
  );
}

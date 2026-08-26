"use client";

import Kbd from "@/components/ui/kbd";
import { QuickOpen } from "@/components/ui/quick-open";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { scc } from "@/core/command";
import { KEY_BINDING } from "@/lib/key-matcher";
import { bumpTable, frecencyScores } from "@/lib/table-frecency";
import { cn } from "@/lib/utils";
import { LucideView, Plus, SquareTerminal, Table } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface PaletteItem {
  key: string;
  kind: "action" | "table" | "view";
  label: string;
  /** Schema the table lives in (tables/views only). */
  schemaName?: string;
  /** Keyboard hint rendered on the row (actions only). */
  shortcut?: string;
  run: () => void;
}

/**
 * The studio's ⌘K palette: one surface that is both navigator (jump to any
 * table or view, frecency-ranked so the ones you work in are on top) and
 * action launcher (new query / new table), with the shortcut taught inline on
 * each action row — the Linear command-menu model, as a thin adapter over
 * QuickOpen.
 */
export default function StudioPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { schema, currentSchemaName } = useSchema();
  const { databaseDriver } = useStudioContext();
  const pathname = usePathname();

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      {
        key: "action:new-query",
        kind: "action",
        label: "New query",
        shortcut: KEY_BINDING.newTab.toString(),
        run: () => scc.tabs.openBuiltinQuery({}),
      },
      ...(databaseDriver.getFlags().supportCreateUpdateTable
        ? [
            {
              key: "action:new-table",
              kind: "action" as const,
              label: "New table",
              run: () =>
                scc.tabs.openBuiltinSchema({ schemaName: currentSchemaName }),
            },
          ]
        : []),
    ];

    const scores = frecencyScores(pathname);
    const tables: PaletteItem[] = Object.values(schema)
      .flat()
      .filter((s) => s.type === "table" || s.type === "view")
      .map((s) => ({
        key: `${s.type}:${s.schemaName}.${s.name}`,
        kind: s.type as "table" | "view",
        label: s.name,
        schemaName: s.schemaName,
        run: () => {
          bumpTable(pathname, s.name);
          scc.tabs.openBuiltinTable({
            schemaName: s.schemaName ?? "",
            tableName: s.name,
          });
        },
      }))
      // Most-used first; fuzzyRank is stable, so this order carries into the
      // unfiltered list and breaks ties while searching.
      .sort((a, b) => (scores[b.label] ?? 0) - (scores[a.label] ?? 0));

    return [...actions, ...tables];
  }, [schema, currentSchemaName, databaseDriver, pathname]);

  return (
    <QuickOpen
      open={open}
      onClose={onClose}
      items={items}
      getKey={(i) => i.key}
      getSearchText={(i) => i.label}
      onPick={(i) => i.run()}
      placeholder="Jump to a table or run a command…"
      renderRow={(i, { active }) => (
        <div
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]",
            active ? "bg-secondary text-foreground" : "text-foreground/90"
          )}
        >
          {i.kind === "action" ? (
            i.key === "action:new-query" ? (
              <SquareTerminal size={15} className="shrink-0 text-muted-foreground" />
            ) : (
              <Plus size={15} className="shrink-0 text-muted-foreground" />
            )
          ) : i.kind === "view" ? (
            <LucideView size={15} className="shrink-0 text-muted-foreground" />
          ) : (
            <Table size={15} className="shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate">{i.label}</span>
          {i.schemaName && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {i.schemaName}
            </span>
          )}
          {i.shortcut && <Kbd className="shrink-0">{i.shortcut}</Kbd>}
        </div>
      )}
    />
  );
}

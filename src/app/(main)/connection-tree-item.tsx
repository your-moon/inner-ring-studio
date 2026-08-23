"use client";

import {
  CaretDown,
  CaretRight,
  CircleNotch,
  Database,
  Table,
  Eye,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { createLocalDriver } from "@/drivers/helpers";
import type { NavConnection } from "./nav-connection-item";
import Link from "next/link";

interface SchemaNode {
  name: string;
  tables: { type: "table" | "view"; name: string }[];
}

/**
 * DBeaver-style tree node for one connection: expand to lazily load the
 * connection's schemas, expand a schema to see its tables/views. Loading the
 * schema list opens the pool (so it doubles as "connect"). Clicking the
 * connection name — or a table — opens the studio.
 */
export default function ConnectionTreeItem({
  conn,
  busy,
  onOpen,
  onAction,
  onDelete,
}: {
  conn: NavConnection;
  busy?: boolean;
  onAction: (id: string, action: "test" | "disconnect") => void;
  onDelete: (id: string, name: string) => void;
  onOpen?: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<SchemaNode[] | null>(null);
  const [openSchemas, setOpenSchemas] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const driver = createLocalDriver({
        name: conn.name,
        driver: (conn.driver as "postgres" | "mysql" | "clickhouse") ?? "postgres",
        vault_id: conn.id,
      });
      const raw = await driver.schemas();
      const nodes: SchemaNode[] = Object.entries(raw)
        .map(([name, items]) => ({
          name,
          tables: items
            .filter((i) => i.type === "table" || i.type === "view")
            .map((i) => ({ type: i.type as "table" | "view", name: i.name })),
        }))
        .filter((n) => n.tables.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      setSchemas(nodes);
      // Auto-expand when there's just one schema (the common Postgres "public").
      if (nodes.length === 1) setOpenSchemas(new Set([nodes[0].name]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load schema");
    } finally {
      setLoading(false);
    }
  }, [conn.id, conn.name, conn.driver]);

  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next && schemas === null && !loading) load();
      return next;
    });
  }, [schemas, loading, load]);

  const toggleSchema = useCallback((name: string) => {
    setOpenSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const connected = !!conn.status?.connected;
  const statusDot = busy || loading ? (
    <CircleNotch size={11} className="shrink-0 animate-spin text-neutral-400" />
  ) : error ? (
    <span
      title={error}
      className="h-2 w-2 shrink-0 rounded-full bg-red-500"
    />
  ) : connected ? (
    <span title="Connected" className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
  ) : (
    <span title="Idle" className="h-2 w-2 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="group flex h-8 items-center gap-1 pr-2 pl-2 text-sm hover:bg-secondary">
            <button
              onClick={toggle}
              className="flex h-5 w-4 shrink-0 items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title={open ? "Collapse" : "Expand"}
            >
              {open ? (
                <CaretDown size={11} weight="bold" />
              ) : (
                <CaretRight size={11} weight="bold" />
              )}
            </button>
            <Database size={15} className="shrink-0 text-neutral-500" />
            <button
              onClick={() => {
                onOpen?.(conn.id);
                router.push(`/vault/${conn.id}`);
              }}
              className="min-w-0 flex-1 truncate text-left"
              title={`Open ${conn.name}`}
            >
              {conn.name}
            </button>
            {statusDot}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <div className="px-2 py-1.5 text-xs text-neutral-500">
            {error ? "Can't connect" : connected ? "Connected" : "Not connected"}
          </div>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => router.push(`/vault/${conn.id}`)}>
            Open
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              // Refresh the schema tree (also (re)connects).
              setSchemas(null);
              setOpen(true);
              load();
            }}
          >
            {connected ? "Refresh" : "Connect"}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!connected}
            onClick={() => onAction(conn.id, "disconnect")}
          >
            Disconnect
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem asChild>
            <Link href={`/connections/${conn.id}/edit`}>Edit connection</Link>
          </ContextMenuItem>
          <ContextMenuItem
            className="text-red-500 focus:text-red-500"
            onClick={() => onDelete(conn.id, conn.name)}
          >
            Delete connection
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {open && (
        <div>
          {loading && schemas === null && (
            <div className="flex h-7 items-center gap-2 pr-2 pl-8 text-xs text-neutral-400">
              <CircleNotch size={12} className="animate-spin" /> Loading…
            </div>
          )}
          {error && (
            <div className="pr-2 pl-8 text-xs text-red-500" title={error}>
              {error}
            </div>
          )}
          {schemas?.length === 0 && (
            <div className="h-7 pr-2 pl-8 text-xs text-neutral-400">No tables</div>
          )}
          {schemas?.map((s) => (
            <div key={s.name}>
              <button
                onClick={() => toggleSchema(s.name)}
                className="flex h-7 w-full items-center gap-1 pr-2 pl-6 text-xs text-neutral-600 hover:bg-secondary dark:text-neutral-300"
              >
                {openSchemas.has(s.name) ? (
                  <CaretDown size={10} weight="bold" className="shrink-0 text-neutral-400" />
                ) : (
                  <CaretRight size={10} weight="bold" className="shrink-0 text-neutral-400" />
                )}
                <span className="truncate font-medium">{s.name}</span>
                <span className="ml-1 font-normal text-neutral-400">
                  {s.tables.length}
                </span>
              </button>
              {openSchemas.has(s.name) &&
                s.tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      onOpen?.(conn.id);
                      router.push(`/vault/${conn.id}`);
                    }}
                    className="flex h-7 w-full items-center gap-1.5 pr-2 pl-11 text-xs text-neutral-600 hover:bg-secondary dark:text-neutral-300"
                    title={`${s.name}.${t.name}`}
                  >
                    {t.type === "view" ? (
                      <Eye size={13} className="shrink-0 text-neutral-400" />
                    ) : (
                      <Table size={13} className="shrink-0 text-neutral-400" />
                    )}
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

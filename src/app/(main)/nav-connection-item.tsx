"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import EnvBadge from "@/components/orbit/env-badge";
import { cn } from "@/lib/utils";
import { Database, LoaderCircle } from "lucide-react";
import Link from "next/link";

export interface NavConnection {
  id: string;
  name: string;
  driver?: string;
  folder?: string;
  environment?: "production" | "staging";
  status?: { connected: boolean; total: number; idle: number };
}

export default function NavConnectionItem({
  conn,
  selected,
  busy,
  onAction,
  onDelete,
  onOpen,
}: {
  conn: NavConnection;
  selected: boolean;
  /** A connect/test is in flight for this connection — show a spinner. */
  busy?: boolean;
  onAction: (id: string, action: "test" | "disconnect") => void;
  onDelete: (id: string, name: string) => void;
  /** Fired when the item is clicked to open, so the parent can show a spinner. */
  onOpen?: (id: string) => void;
}) {
  const connected = !!conn.status?.connected;
  const status = busy ? (
    <span title="Connecting…" className="inline-flex">
      <LoaderCircle
        size={12}
        className="animate-spin [color:var(--content-tertiary)]"
      />
    </span>
  ) : connected ? (
    <span
      title="Active connection"
      className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
    />
  ) : (
    <span
      title="Idle"
      className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]"
    />
  );
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          href={`/vault/${conn.id}`}
          onClick={() => onOpen?.(conn.id)}
          aria-current={selected ? "page" : undefined}
          className={cn(
            "focus-ring text-ui-small group flex h-7 items-center gap-2 rounded-[var(--radius-control)] px-2",
            selected
              ? "bg-surface-hover font-[var(--weight-medium)] [color:var(--content-primary)]"
              : "[color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
          )}
        >
          <Database size={14} className="shrink-0 opacity-75" />
          <span className="min-w-0 flex-1 truncate">{conn.name}</span>
          <EnvBadge environment={conn.environment} />
          {status}
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-xs [color:var(--content-tertiary)]">
          {connected ? "Connected" : "Not connected"}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onAction(conn.id, "test")}>
          {connected ? "Retry" : "Connect"}
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
  );
}

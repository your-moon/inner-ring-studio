"use client";

import { SidebarMenuItem } from "@/components/sidebar-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CircleNotch, Database } from "@phosphor-icons/react";
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
  const badge = busy ? (
    <span title="Connecting…" className="mr-2 inline-flex">
      <CircleNotch
        size={12}
        weight="bold"
        className="animate-spin text-muted-foreground"
      />
    </span>
  ) : connected ? (
    <span
      title="Active connection"
      className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"
    />
  ) : undefined;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onClick={() => onOpen?.(conn.id)}>
          <SidebarMenuItem
            text={conn.name}
            icon={Database}
            href={`/vault/${conn.id}`}
            selected={selected}
            badge={badge}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
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

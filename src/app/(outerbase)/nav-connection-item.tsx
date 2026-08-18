"use client";

import { SidebarMenuItem } from "@/components/sidebar-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Database } from "@phosphor-icons/react";

export interface NavConnection {
  id: string;
  name: string;
  folder?: string;
  status?: { connected: boolean; total: number; idle: number };
}

export default function NavConnectionItem({
  conn,
  selected,
  onAction,
}: {
  conn: NavConnection;
  selected: boolean;
  onAction: (id: string, action: "test" | "disconnect") => void;
}) {
  const connected = !!conn.status?.connected;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <SidebarMenuItem
            text={conn.name}
            icon={Database}
            href={`/vault/${conn.id}`}
            selected={selected}
            badge={
              connected ? (
                <span
                  title="Active connection"
                  className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"
                />
              ) : undefined
            }
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-xs text-neutral-500">
          {connected ? "Connected" : "Not connected"}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onAction(conn.id, "test")}>
          {connected ? "Retry" : "Connect"}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!connected}
          className="text-red-500 focus:text-red-500"
          onClick={() => onAction(conn.id, "disconnect")}
        >
          Disconnect
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

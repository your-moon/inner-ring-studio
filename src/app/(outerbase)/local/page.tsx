"use client";

import { MySQLIcon, SQLiteIcon } from "@/components/icons/outerbase-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";
import { ResourceItemList, ResourceItemProps } from "../resource-item-helper";
import { deleteLocalBaseDialog } from "./dialog-base-delete";
import { createLocalBoardDialog } from "./dialog-board-create";
import { deleteLocalBoardDialog } from "./dialog-board-delete";
import { useLocalConnectionList, useLocalDashboardList } from "./hooks";

export default function LocalConnectionPage() {
  const router = useRouter();

  const {
    data: localBases,
    isLoading,
    mutate: refreshBase,
  } = useLocalConnectionList();

  // Connections stored in the server-side encrypted vault (added via the CLI:
  // `pmsql conn add`). Fetched without secrets and opened by their vault id.
  const { data: vaultData } = useSWR<{
    connections: {
      id: string;
      name: string;
      driver: string;
      createdAt: number;
      folder?: string;
    }[];
  }>("/api/connections", (url: string) => fetch(url).then((r) => r.json()));

  const baseResources = useMemo(() => {
    const local = (localBases ?? []).map((conn) => {
      return {
        href:
          conn.content.driver === "sqlite-filehandler"
            ? `/playground/client?s=${conn.id}`
            : `/client/s/${conn.content.driver ?? "turso"}?p=${conn.id}`,
        name: conn.content.name,
        lastUsed: conn.updated_at,
        id: conn.id,
        type: conn.content.driver,
        status: "",
        color: conn.content.label || "default",
      } as ResourceItemProps;
    });

    const vault = (vaultData?.connections ?? []).map((conn) => {
      return {
        href: `/vault/${conn.id}`,
        name: conn.name,
        lastUsed: conn.createdAt,
        id: `vault-${conn.id}`,
        type: conn.driver,
        status: "vault",
        color: "default",
        folder: conn.folder,
      } as ResourceItemProps;
    });

    return [...vault, ...local];
  }, [localBases, vaultData]);

  // Getting the board from indexdb
  const { data: dashboardList, mutate: refreshDashboard } =
    useLocalDashboardList();
  const dashboardResources = useMemo(() => {
    return (
      (dashboardList ?? []).map((board) => {
        return {
          href: `/local/board/${board.id}`,
          name: board.content.name,
          lastUsed: board.content.updated_at,
          id: board.id,
          type: "board",
        } as ResourceItemProps;
      }) ?? []
    );
  }, [dashboardList]);

  const onBoardCreate = useCallback(() => {
    createLocalBoardDialog.show({}).then(() => {
      refreshDashboard();
    });
  }, [refreshDashboard]);

  const onBaseRemove = useCallback(
    (deletedResource: ResourceItemProps) => {
      if (deletedResource.id.startsWith("vault-")) {
        // Vault connections are managed from the CLI: `pmsql conn rm <name>`.
        return;
      }
      deleteLocalBaseDialog
        .show({ baseId: deletedResource.id, baseName: deletedResource.name })
        .then(refreshBase)
        .catch();
    },
    [refreshBase]
  );

  const onBoardRemove = useCallback((deletedResource: ResourceItemProps) => {
    deleteLocalBoardDialog
      .show({ boardId: deletedResource.id, boardName: deletedResource.name })
      .then()
      .catch();
  }, []);

  return (
    <NavigationLayout>
      <div className="flex flex-1 flex-col content-start gap-4 overflow-x-hidden overflow-y-auto p-4">
        <ResourceItemList
          boards={dashboardResources}
          bases={baseResources ?? []}
          loading={isLoading}
          onBoardRemove={onBoardRemove}
          onBaseRemove={onBaseRemove}
          onBaseEdit={(resource) => {
            if (resource.id.startsWith("vault-")) return; // CLI-managed
            router.push(`/local/edit-base/${resource.id}`);
          }}
          onBoardCreate={onBoardCreate}
        />
      </div>
    </NavigationLayout>
  );
}

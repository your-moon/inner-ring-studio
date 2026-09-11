"use client";

import { SavedConnectionRawLocalStorage } from "@/app/(theme)/connect/saved-connection-storage";
import { Studio } from "@/components/gui/studio";
import { Skeleton } from "@/components/orbit";
import { StudioExtensionManager } from "@/core/extension-manager";
import { createPostgreSQLExtensions } from "@/core/standard-extension";
import { createLocalDriver } from "@/drivers/helpers";
import IndexdbSavedDoc from "@/drivers/saved-doc/indexdb-saved-doc";
import { useAvailableAIAgents } from "@/lib/ai-agent-storage";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/**
 * Opens a connection stored in the server-side encrypted vault directly by id.
 * No IndexedDB record and no password on the client: the driver's transport
 * sends only the vault id, and /api/query resolves credentials server-side.
 */
export default function VaultStudioClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [environment, setEnvironment] = useState<
    "production" | "staging" | undefined
  >();
  const [driverName, setDriverName] = useState<
    "postgres" | "clickhouse" | "mysql"
  >("postgres");
  const [notFound, setNotFound] = useState(false);
  // Gate mounting until we know the connection's real driver — otherwise Studio
  // briefly mounts with the default (postgres) driver and fires postgres schema
  // queries against e.g. a ClickHouse connection ("couldn't load tables").
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/connections")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const found = (j.connections ?? []).find(
          (c: { id: string; name: string; driver?: string; environment?: string }) =>
            c.id === id
        );
        if (found) {
          setName(found.name);
          if (found.environment === "production" || found.environment === "staging")
            setEnvironment(found.environment);
          if (found.driver === "clickhouse") setDriverName("clickhouse");
          else if (found.driver === "mysql") setDriverName("mysql");
          setReady(true);
        } else setNotFound(true);
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const config: SavedConnectionRawLocalStorage = useMemo(
    () => ({
      name: name || "Vault connection",
      driver: driverName,
      vault_id: id,
    }),
    [name, driverName, id]
  );

  const driver = useMemo(() => createLocalDriver(config), [config]);

  const extensions = useMemo(
    () => new StudioExtensionManager(createPostgreSQLExtensions()),
    []
  );

  const agentDriver = useAvailableAIAgents(driver);
  const docDriver = useMemo(() => new IndexdbSavedDoc(`vault-${id}`), [id]);

  if (notFound) {
    return (
      <div className="p-8">
        No vault connection with id <code>{id}</code>. Add one with{" "}
        <code>pmsql conn add</code>.
      </div>
    );
  }

  // Wait for the driver to be resolved before mounting Studio. This used to
  // be a single static "Connecting…" line on an otherwise blank screen --
  // fine on a fast connection, but with no motion at all it reads as
  // frozen on a slower one (confirmed live: the click registers, the route
  // changes, and then nothing visibly happens until this resolves). An
  // inline skeleton of the shell that's about to render gives the same
  // "something is happening" signal `schema-sidebar.tsx`'s spinner already
  // gives elsewhere in the app, just for this earlier gate.
  if (!ready) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="border-border-default bg-surface-panel flex w-64 shrink-0 flex-col gap-4 border-r p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-7 w-full rounded-[var(--radius-control)]" />
          <div className="flex flex-col gap-2.5 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: `${70 - i * 4}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-[var(--radius-control)]" />
            <Skeleton className="h-6 w-16 rounded-[var(--radius-control)]" />
          </div>
          <Skeleton className="h-9 w-full rounded-[var(--radius-control)]" />
          <Skeleton className="h-40 w-full flex-1 rounded-[var(--radius-panel)]" />
        </div>
      </div>
    );
  }

  return (
    <Studio
      extensions={extensions}
      driver={driver}
      name={config.name}
      color="blue"
      environment={environment}
      onBack={() => router.push("/local")}
      docDriver={docDriver}
      agentDriver={agentDriver}
    />
  );
}

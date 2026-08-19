"use client";

import { SavedConnectionRawLocalStorage } from "@/app/(theme)/connect/saved-connection-storage";
import { Studio } from "@/components/gui/studio";
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
  const [driverName, setDriverName] = useState<
    "postgres" | "clickhouse" | "mysql"
  >("postgres");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/connections")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const found = (j.connections ?? []).find(
          (c: { id: string; name: string; driver?: string }) => c.id === id
        );
        if (found) {
          setName(found.name);
          if (found.driver === "clickhouse") setDriverName("clickhouse");
          else if (found.driver === "mysql") setDriverName("mysql");
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

  return (
    <Studio
      extensions={extensions}
      driver={driver}
      name={config.name}
      color="blue"
      onBack={() => router.push("/local")}
      docDriver={docDriver}
      agentDriver={agentDriver}
    />
  );
}

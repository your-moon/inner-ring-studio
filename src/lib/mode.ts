import { CloudConnectionStore } from "./cloud-db";
import { ConnectionStore, VaultConnectionStore } from "./connection-store";

/**
 * Deployment mode. Selects where connections + accounts live:
 * - desktop / selfhosted: single tenant, encrypted vault file (default).
 * - cloud: per-user rows in a Postgres (see cloud-db.ts).
 */
export const MODE = process.env.DEPLOY_MODE ?? "selfhosted";
export const IS_CLOUD = MODE === "cloud";

let store: ConnectionStore | null = null;

export function getConnectionStore(): ConnectionStore {
  if (!store) {
    store = IS_CLOUD ? new CloudConnectionStore() : new VaultConnectionStore();
  }
  return store;
}

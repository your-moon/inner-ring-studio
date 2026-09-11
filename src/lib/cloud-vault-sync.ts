import { syncVault, type VaultSyncPorts } from "./vault-sync";
import { readVault, writeVault, type VaultConnection } from "./vault";
import type { MergeableVault, Tombstone } from "./vault-merge";
import { cloudLinkUrl, getCloudSession, IS_LINKED } from "./cloud-link";

/**
 * Cloud <-> local vault connection sync (linked mode, personal workspace
 * only). See docs/superpowers/specs/2026-09-11-cloud-vault-sync-design.md.
 *
 * Reuses `syncVault` unchanged, with an HTTP-backed `VaultSyncPorts`
 * (`cloudVaultPorts`) instead of the git one in vault-sync.ts's
 * `defaultVaultPorts`: fetch is a no-op (there's no separate fetch step over
 * HTTP -- readRemote does the GET), readRemote/push talk to
 * /api/workspace/connections/raw, and a rejected push (stale version) makes
 * syncVault re-fetch and re-merge, exactly like a non-fast-forward git push.
 */

const RAW_PATH = "/api/workspace/connections/raw";

interface RawResponse {
  connections: VaultConnection[];
  tombstones: Tombstone[];
  version: number;
}

function cloudVaultPorts(): VaultSyncPorts {
  const base = cloudLinkUrl();
  const session = getCloudSession();
  let remoteVersion = 0;
  let pending: Required<MergeableVault> | null = null;

  // Every failure here used to be silently swallowed -- the exact anti-pattern
  // already fixed for the git leg (vault-sync.ts) earlier, and reintroduced
  // here without noticing: a real sync blocker (session expired, cloud
  // unreachable, a rejected merge) produced no trace anywhere, so this ran
  // silently broken against a real account for two weeks before anyone saw
  // a symptom worth investigating.
  const authedFetch = async (init: RequestInit): Promise<Response | null> => {
    if (!base || !session) return null;
    const res = await fetch(base + RAW_PATH, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookie,
        ...(init.headers as Record<string, string> | undefined),
      },
    }).catch((e) => {
      console.error(`[cloud-vault-sync] ${init.method ?? "GET"} ${RAW_PATH} failed:`, e);
      return null;
    });
    if (res && !res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[cloud-vault-sync] ${init.method ?? "GET"} ${RAW_PATH} -> HTTP ${res.status}: ${body}`
      );
    }
    return res;
  };

  return {
    fetch: () => true,
    readLocal: () => readVault(),
    readRemote: async () => {
      const res = await authedFetch({ method: "GET" });
      if (!res || !res.ok) return null;
      const data = (await res.json().catch(() => null)) as RawResponse | null;
      if (!data) return null;
      remoteVersion = data.version;
      return { connections: data.connections, tombstones: data.tombstones };
    },
    writeMerged: (merged) => {
      pending = merged;
      writeVault(merged as unknown as Parameters<typeof writeVault>[0]);
    },
    push: async () => {
      if (!pending) return false;
      const res = await authedFetch({
        method: "POST",
        body: JSON.stringify({
          connections: pending.connections,
          tombstones: pending.tombstones,
          expectedVersion: remoteVersion,
        }),
      });
      return !!res && res.ok;
    },
  };
}

/** Run a conflict-free cloud-vault sync now. No-op (ok:false) unless linked
 *  and signed in -- never blocks or throws for the caller. */
export async function syncCloudVaultNow(): Promise<{ ok: boolean; message: string }> {
  if (!IS_LINKED) return { ok: false, message: "not linked to a cloud account" };
  if (!getCloudSession()) return { ok: false, message: "not signed in" };
  const r = await syncVault(cloudVaultPorts());
  return {
    ok: r.pushed,
    message: r.pushed ? "synced" : `push failed after ${r.attempts} attempts`,
  };
}

let cloudSyncTimer: NodeJS.Timeout | null = null;
let lastCloudSyncAt = 0;

/** Throttled background sync for the cloud-vault leg -- same shape and
 *  intervals as vault-sync.ts's scheduleBackgroundSync (git leg), run as an
 *  independent sibling: either can no-op or fail without affecting the
 *  other. Safe to call unconditionally; no-ops when not linked/signed in. */
export function scheduleCloudVaultSync(delayMs = 1500, minIntervalMs = 15000): void {
  if (!IS_LINKED || !getCloudSession()) return;
  if (cloudSyncTimer) return; // a run is already scheduled
  const wait = Math.max(delayMs, minIntervalMs - (Date.now() - lastCloudSyncAt));
  cloudSyncTimer = setTimeout(async () => {
    cloudSyncTimer = null;
    lastCloudSyncAt = Date.now();
    try {
      await syncCloudVaultNow();
    } catch {
      /* best-effort; a failed background sync must never crash the app */
    }
  }, wait);
  cloudSyncTimer.unref?.();
}

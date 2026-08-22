import { execFileSync } from "child_process";
import { mergeVaults, type MergeableVault } from "./vault-merge";
import { configDir, isRepo, remoteUrl } from "./config-repo";
import { decryptVaultFile, readVault, writeVault } from "./vault";

/**
 * Git-vault sync. Because the vault re-encrypts on every write (fresh salt/iv →
 * a wholly different ciphertext), git can never merge the blob. So sync never
 * lets it: it fetches, decrypts BOTH sides, {@link mergeVaults} them on the plain
 * JSON, writes the merged result, and pushes. If the push is rejected because the
 * remote moved again, it re-fetches and retries the merge.
 *
 * The side-effectful steps are behind {@link VaultSyncPorts} so the orchestration
 * (merge-on-pull + retry) is testable without a real repo.
 */
export interface VaultSyncPorts {
  /** Fetch the remote branch (best-effort). */
  fetch(): boolean;
  /** The local decrypted vault. */
  readLocal(): MergeableVault;
  /** The remote decrypted vault from the fetched ref, or null if none/unreadable. */
  readRemote(): MergeableVault | null;
  /** Write the merged vault locally and commit it. */
  writeMerged(merged: Required<MergeableVault>): void;
  /** Push; false when the remote moved (non-fast-forward) or the push failed. */
  push(): boolean;
}

export interface VaultSyncResult {
  merged: boolean;
  pushed: boolean;
  attempts: number;
}

export function syncVault(
  ports: VaultSyncPorts,
  maxAttempts = 3
): VaultSyncResult {
  let mergedRemote = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    ports.fetch();
    const local = ports.readLocal();
    const remote = ports.readRemote();
    mergedRemote = remote !== null;
    const merged = remote
      ? mergeVaults(local, remote)
      : { connections: local.connections, tombstones: local.tombstones ?? [] };
    ports.writeMerged(merged);
    if (ports.push())
      return { merged: mergedRemote, pushed: true, attempts: attempt };
  }
  return { merged: mergedRemote, pushed: false, attempts: maxAttempts };
}

// --- real git wiring for the config-dir vault (per-workspace clones come later) ---

export function defaultVaultPorts(branch = "main"): VaultSyncPorts {
  const cwd = configDir();
  const runOk = (args: string[]): boolean => {
    try {
      execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
      return true;
    } catch {
      return false;
    }
  };
  const runOut = (args: string[]): string | null => {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8" });
    } catch {
      return null;
    }
  };

  return {
    fetch: () => runOk(["fetch", "origin", branch]),
    readLocal: () => readVault(),
    readRemote: () => {
      const blob = runOut(["show", `origin/${branch}:vault.enc`]);
      if (!blob) return null;
      try {
        return decryptVaultFile(blob);
      } catch {
        return null;
      }
    },
    writeMerged: (merged) => {
      writeVault(merged as unknown as Parameters<typeof writeVault>[0]);
      runOk(["add", "vault.enc"]);
      runOk(["commit", "-m", "pmsql: sync connections"]);
    },
    push: () => runOk(["push", "origin", `HEAD:${branch}`]),
  };
}

/** Run a conflict-free sync now (pull → merge → push). Replaces the old naive
 *  `git pull --rebase`, which conflicts on the re-encrypted vault blob. */
export function syncVaultNow(branch = "main"): { ok: boolean; message: string } {
  if (!isRepo()) return { ok: false, message: "vault is not a git repo" };
  if (!remoteUrl())
    return { ok: false, message: "no 'origin' remote — link a repo first" };
  const r = syncVault(defaultVaultPorts(branch));
  return {
    ok: r.pushed,
    message: r.pushed
      ? `synced${r.merged ? " (merged remote changes)" : ""}`
      : `push failed after ${r.attempts} attempts (check git auth)`,
  };
}

let syncTimer: NodeJS.Timeout | null = null;

/**
 * Debounced background sync — safe to fire after every connection mutation. Runs
 * the full pull→merge→push out of band, so edits are auto-synced without blocking
 * the request. No-op when the vault isn't a linked git repo.
 */
export function scheduleBackgroundSync(delayMs = 1500): void {
  if (!isRepo() || !remoteUrl()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    try {
      syncVaultNow();
    } catch {
      /* best-effort; a failed background sync must never crash the app */
    }
  }, delayMs);
  syncTimer.unref?.();
}

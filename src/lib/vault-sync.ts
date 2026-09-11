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
  fetch(): boolean | Promise<boolean>;
  /** The local decrypted vault. */
  readLocal(): MergeableVault | Promise<MergeableVault>;
  /** The remote decrypted vault from the fetched ref, or null if none/unreadable. */
  readRemote(): MergeableVault | null | Promise<MergeableVault | null>;
  /** Write the merged vault locally and commit it. */
  writeMerged(merged: Required<MergeableVault>): void | Promise<void>;
  /** Push; false when the remote moved (non-fast-forward) or the push failed. */
  push(): boolean | Promise<boolean>;
}

export interface VaultSyncResult {
  merged: boolean;
  pushed: boolean;
  attempts: number;
  /** True when the remote actually brought new/changed connections (as opposed
   *  to a no-op merge) — used to notify the user that their list updated. */
  changed: boolean;
}

/** Order-independent signature of the connection set (id + version). */
function connSignature(v: MergeableVault): string {
  return v.connections
    .map((c) => `${c.id}:${c.updatedAt}`)
    .sort()
    .join(",");
}

export async function syncVault(
  ports: VaultSyncPorts,
  maxAttempts = 3
): Promise<VaultSyncResult> {
  let mergedRemote = false;
  let changed = false;
  // Signature of where we started, so `changed` reflects the whole sync (not just
  // the last retry, whose local was already merged by an earlier attempt).
  let originalSig: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await ports.fetch();
    const local = await ports.readLocal();
    if (originalSig === null) originalSig = connSignature(local);
    const remote = await ports.readRemote();
    mergedRemote = remote !== null;
    const merged = remote
      ? mergeVaults(local, remote)
      : { connections: local.connections, tombstones: local.tombstones ?? [] };
    changed = mergedRemote && connSignature(merged) !== originalSig;
    await ports.writeMerged(merged);
    if (await ports.push())
      return { merged: mergedRemote, pushed: true, attempts: attempt, changed };
  }
  return { merged: mergedRemote, pushed: false, attempts: maxAttempts, changed };
}

// Timestamp of the last sync that pulled in real remote changes; the client polls
// this (via /api/connections) to toast "connections updated" once.
let lastRemoteChangeAt = 0;
export function getLastRemoteChangeAt(): number {
  return lastRemoteChangeAt;
}

// --- real git wiring for the config-dir vault (per-workspace clones come later) ---

export function defaultVaultPorts(branch = "main"): VaultSyncPorts {
  const cwd = configDir();
  const runOk = (args: string[]): boolean => {
    try {
      execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
      return true;
    } catch (e) {
      // Every failure here used to be silently swallowed, which is exactly
      // what let two real bugs (non-fast-forward pushes, a missing commit
      // identity) hide behind a generic "push failed, check git auth"
      // message. Surface the real git stderr so the next one doesn't.
      const stderr = (e as { stderr?: Buffer | string }).stderr;
      if (stderr && String(stderr).trim()) {
        console.error(`[vault-sync] git ${args.join(" ")} failed:\n${stderr}`);
      }
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
      // `fetch` above only moves the origin/<branch> *tracking* ref — it never
      // moves local HEAD. If we committed the merge straight on top of local
      // HEAD here, and fetch actually pulled new commits (the exact case this
      // engine exists for: two devices each wrote since the last sync), the new
      // commit would not be a descendant of origin/<branch> and `push` below
      // would be rejected non-fast-forward — every retry, since nothing moves
      // local HEAD in between. So land on the fetched tip first (no-op, and
      // harmless, on the very first sync to an empty remote where the ref
      // doesn't exist yet); the merged JSON already reconciles both sides, so
      // discarding local's commit here loses no data.
      runOk(["reset", "--hard", `origin/${branch}`]);
      writeVault(merged as unknown as Parameters<typeof writeVault>[0]);
      runOk(["add", "vault.enc"]);
      // -c user.*: this must work on a machine with no global git identity
      // configured (a fresh box, a CI runner, a container) — commitConfig in
      // config-repo.ts already sets this for the same reason; this call just
      // never matched it.
      runOk([
        "-c",
        "user.name=pmsql",
        "-c",
        "user.email=pmsql@localhost",
        "commit",
        "-m",
        "pmsql: sync connections",
      ]);
    },
    push: () => runOk(["push", "origin", `HEAD:${branch}`]),
  };
}

/** Run a conflict-free sync now (pull → merge → push). Replaces the old naive
 *  `git pull --rebase`, which conflicts on the re-encrypted vault blob. */
export async function syncVaultNow(
  branch = "main"
): Promise<{ ok: boolean; message: string }> {
  if (!isRepo()) return { ok: false, message: "vault is not a git repo" };
  if (!remoteUrl())
    return { ok: false, message: "no 'origin' remote — link a repo first" };
  const r = await syncVault(defaultVaultPorts(branch));
  if (r.changed) lastRemoteChangeAt = Date.now();
  return {
    ok: r.pushed,
    message: r.pushed
      ? `synced${r.merged ? " (merged remote changes)" : ""}`
      : `push failed after ${r.attempts} attempts (check git auth)`,
  };
}

let syncTimer: NodeJS.Timeout | null = null;
let lastSyncAt = 0;

/**
 * Throttled background sync — safe to fire after every connection mutation AND on
 * every list read (for the pull direction). Runs the full pull→merge→push out of
 * band, at most once per `minIntervalMs`, so frequent triggers coalesce. No-op
 * when the vault isn't a linked git repo.
 */
export function scheduleBackgroundSync(
  delayMs = 1500,
  minIntervalMs = 15000
): void {
  if (!isRepo() || !remoteUrl()) return;
  if (syncTimer) return; // a run is already scheduled
  const wait = Math.max(delayMs, minIntervalMs - (Date.now() - lastSyncAt));
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    lastSyncAt = Date.now();
    try {
      await syncVaultNow();
    } catch {
      /* best-effort; a failed background sync must never crash the app */
    }
  }, wait);
  syncTimer.unref?.();
}

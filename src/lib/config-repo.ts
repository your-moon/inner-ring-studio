import { execFileSync } from "child_process";
import { mkdirSync, realpathSync } from "fs";
import { dirname } from "path";
import { vaultPath } from "./vault";

/**
 * Git-backed config. pmsql runs locally, but the encrypted vault lives in a git
 * repo (e.g. a private GitHub repo) so it's available on every device: clone the
 * repo, point pmsql at it, `pmsql sync` to pull/push. Because the vault is
 * AES-256-GCM encrypted, it is safe to store in a remote git repo.
 *
 * The config dir is the directory holding vault.enc (default ~/.config/pmsql,
 * override with PMSQL_VAULT / PMSQL_CONFIG_DIR).
 */

export function configDir(): string {
  return process.env.PMSQL_CONFIG_DIR ?? dirname(vaultPath());
}

interface GitResult {
  ok: boolean;
  out: string;
  err: string;
}

function git(args: string[], cwd: string = configDir()): GitResult {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: out.trim(), err: "" };
  } catch (e) {
    const err = e as { stderr?: Buffer | string; stdout?: Buffer | string };
    return {
      ok: false,
      out: String(err.stdout ?? "").trim(),
      err: String(err.stderr ?? "").trim(),
    };
  }
}

export function isRepo(): boolean {
  // The config dir must be a git repo ITSELF, not merely inside one. Without
  // this, a config dir living inside some project checkout (PMSQL_CONFIG_ROOT
  // pointed at a subfolder) resolves to the ENCLOSING repo, and commitConfig's
  // `git add -A` commits vault noise into that project under the pmsql
  // identity.
  const top = git(["rev-parse", "--show-toplevel"]);
  if (!top.ok) return false;
  try {
    return realpathSync(top.out) === realpathSync(configDir());
  } catch {
    return false;
  }
}

export function remoteUrl(): string | null {
  const r = git(["remote", "get-url", "origin"]);
  return r.ok ? r.out : null;
}

/**
 * Initialize `dir` as a git repo tracking `url`, pulling any existing config.
 * Used to link a specific vault dir; `linkRepo` below links the active vault.
 */
export function linkRepoInto(dir: string, url: string): { message: string } {
  mkdirSync(dir, { recursive: true });
  if (!git(["rev-parse", "--is-inside-work-tree"], dir).ok) {
    const init = git(["init", "-q", "-b", "main"], dir);
    if (!init.ok) return { message: `git init failed: ${init.err}` };
  }
  git(["remote", "remove", "origin"], dir); // ignore if absent
  const add = git(["remote", "add", "origin", url], dir);
  if (!add.ok) return { message: `failed to set origin: ${add.err}` };

  // Try to pull existing config from the remote's main branch.
  const fetch = git(["fetch", "--depth", "1", "origin", "main"], dir);
  if (fetch.ok) {
    git(["checkout", "-B", "main", "origin/main"], dir);
    return { message: `linked ${url} — pulled existing config` };
  }
  // Empty remote: just make a local main branch.
  git(["checkout", "-B", "main"], dir);
  return { message: `linked ${url} — remote is empty, will publish on next sync` };
}

/** Initialize the active config dir as a git repo tracking `url`. */
export function linkRepo(url: string): { message: string } {
  return linkRepoInto(configDir(), url);
}

/** Commit vault changes locally (no-op if nothing changed or not a repo). */
export function commitConfig(message: string): void {
  if (!isRepo()) return;
  git(["add", "-A"]);
  const status = git(["status", "--porcelain"]);
  if (status.ok && status.out) {
    git([
      "-c",
      "user.name=pmsql",
      "-c",
      "user.email=pmsql@localhost",
      "commit",
      "-q",
      "-m",
      message,
    ]);
  }
}

/** Pull (rebase) then push the config to the remote. */
export function sync(): { ok: boolean; message: string } {
  if (!isRepo()) {
    return {
      ok: false,
      message: "config is not a git repo. Run: pmsql config link <repo-url>",
    };
  }
  if (!remoteUrl()) {
    return { ok: false, message: "no 'origin' remote. Run: pmsql config link <repo-url>" };
  }

  commitConfig("pmsql: update config");

  const parts: string[] = [];
  const pull = git(["pull", "--rebase", "origin", "main"]);
  parts.push(pull.ok ? "pulled" : "pull skipped (empty/first sync)");

  const push = git(["push", "-u", "origin", "main"]);
  if (push.ok) {
    parts.push("pushed");
    return { ok: true, message: parts.join(", ") };
  }
  parts.push(`push failed: ${push.err || "check auth (gh/ssh credentials)"}`);
  return { ok: false, message: parts.join(", ") };
}

export function status(): string {
  if (!isRepo()) return "not linked (run: pmsql config link <repo-url>)";
  const remote = remoteUrl() ?? "(no remote)";
  const dirty = git(["status", "--porcelain"]).out;
  return `config dir: ${configDir()}\n  remote: ${remote}\n  state:  ${dirty ? "local changes not synced" : "clean"}`;
}

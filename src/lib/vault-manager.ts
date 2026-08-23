/**
 * Orchestration for desktop multi-vault: create / link / switch / forget vaults.
 * Sits on top of the pure registry ops (`./vault-registry`) and the file layer
 * (`./vault-registry-store`), and reaches for git (`./config-repo`) when linking
 * an existing remote vault.
 *
 * All vaults on a machine share the one process passphrase (PMSQL_PASSPHRASE) —
 * the desktop model is a single machine passphrase, so linking a remote vault
 * only decrypts if it was encrypted with that same passphrase.
 */

import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { join } from "path";
import { linkRepoInto } from "./config-repo";
import {
  addVault as regAdd,
  removeVault as regRemove,
  setActive as regSetActive,
  type VaultEntry,
} from "./vault-registry";
import {
  configRoot,
  loadRegistry,
  saveRegistry,
} from "./vault-registry-store";

/**
 * Multi-vault is meaningful only when the active vault is resolved from the
 * registry. A pinned `PMSQL_VAULT` (the self-hosted server, or a single-vault
 * power user) always wins in `vaultPath`, so switching/adding would be a silent
 * no-op — disable the feature entirely in that case.
 */
export function multiVaultEnabled(): boolean {
  return !process.env.PMSQL_VAULT;
}

export interface VaultSummary {
  id: string;
  name: string;
  dir: string;
  repoUrl?: string;
  active: boolean;
}

/** The registry as a UI-facing list, with the active one flagged. */
export function listVaults(): VaultSummary[] {
  const reg = loadRegistry();
  return reg.vaults.map((v) => ({
    id: v.id,
    name: v.name,
    dir: v.dir,
    repoUrl: v.repoUrl,
    active: v.id === reg.active,
  }));
}

/** A short, filesystem-safe id that doesn't collide with an existing vault dir. */
function freshId(): string {
  for (let i = 0; i < 10; i++) {
    const id = randomBytes(4).toString("hex");
    if (id !== "default" && !existsSync(join(configRoot(), id))) return id;
  }
  throw new Error("could not allocate a vault id");
}

export interface AddVaultOpts {
  name: string;
  /** "create" makes a fresh empty vault; "link" clones an existing git-vault. */
  mode: "create" | "link";
  /** Required for mode "link": the git remote URL of an existing vault. */
  url?: string;
}

/**
 * Register a new vault. For "link" this clones the remote into a fresh dir; for
 * "create" the dir is made and its `vault.enc` is written lazily on first save.
 * Does NOT switch to it — call `switchVault` for that.
 */
export function addVault(opts: AddVaultOpts): { entry: VaultEntry; message: string } {
  const name = opts.name?.trim();
  if (!name) throw new Error("a vault name is required");

  const id = freshId();
  const dir = join(configRoot(), id);
  const entry: VaultEntry = { id, name, dir };
  let message = `created vault "${name}"`;

  if (opts.mode === "link") {
    const url = opts.url?.trim();
    if (!url) throw new Error("a repo URL is required to link a vault");
    const res = linkRepoInto(dir, url);
    entry.repoUrl = url;
    entry.branch = "main";
    message = res.message;
  }

  // regAdd enforces unique id + name; save only if it accepts the entry.
  const reg = regAdd(loadRegistry(), entry);
  saveRegistry(reg);
  return { entry, message };
}

/** Switch the active vault. The next vault read/write resolves to it. */
export function switchVault(id: string): { active: string } {
  const reg = regSetActive(loadRegistry(), id);
  saveRegistry(reg);
  return { active: reg.active };
}

/**
 * Unregister a vault. Leaves its files on disk (the encrypted vault + git repo)
 * — forgetting a vault must never destroy credentials. Refuses the last vault.
 */
export function forgetVault(id: string): { active: string } {
  const reg = regRemove(loadRegistry(), id);
  saveRegistry(reg);
  return { active: reg.active };
}

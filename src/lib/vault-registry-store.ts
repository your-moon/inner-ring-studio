/**
 * File-backed layer over the pure registry ops in `./vault-registry`.
 *
 * The registry (`vaults.json`) records the set of git-vaults on this machine and
 * which is active. It lives at the *config root* — NOT inside any vault dir —
 * so switching vaults never rewrites a synced repo:
 *
 *   <config-root>/vaults.json          the registry
 *   <config-root>/vault.enc            the "default" vault (today's layout)
 *   <config-root>/<other>/vault.enc    additional vaults
 *
 * Config root resolution:
 *   PMSQL_CONFIG_ROOT   explicit base (the desktop sets this to its userData dir)
 *   default             ~/.config/pmsql
 *
 * When no `vaults.json` exists we behave as a single-vault install: one implicit
 * "default" entry living directly in the config root, i.e. exactly today's
 * `<config-root>/vault.enc`. So a machine that never touches multi-vault sees no
 * change. `PMSQL_VAULT` (a pinned single vault, honoured in `vaultPath`) bypasses
 * this layer entirely, which is what the tests and single-vault power users rely on.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  activeEntry,
  type VaultEntry,
  type VaultRegistry,
} from "./vault-registry";

/** Base dir holding `vaults.json` and the default vault. */
export function configRoot(): string {
  return process.env.PMSQL_CONFIG_ROOT ?? join(homedir(), ".config", "pmsql");
}

/** Path to the registry file. */
export function registryPath(): string {
  return join(configRoot(), "vaults.json");
}

/**
 * The implicit registry when no `vaults.json` exists: a single "default" entry
 * living directly in the config root, which resolves to today's single-vault
 * layout unchanged.
 */
export function defaultRegistry(): VaultRegistry {
  const entry: VaultEntry = { id: "default", name: "Default", dir: configRoot() };
  return { active: "default", vaults: [entry] };
}

function isRegistry(value: unknown): value is VaultRegistry {
  if (!value || typeof value !== "object") return false;
  const r = value as VaultRegistry;
  return (
    typeof r.active === "string" &&
    Array.isArray(r.vaults) &&
    r.vaults.length > 0 &&
    r.vaults.every(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.dir === "string"
    )
  );
}

/**
 * Read the registry. Falls back to `defaultRegistry()` when the file is absent,
 * unreadable, or malformed — a corrupt registry must never brick the app or,
 * worse, lose track of the user's vaults.
 */
export function loadRegistry(): VaultRegistry {
  const path = registryPath();
  if (!existsSync(path)) return defaultRegistry();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return isRegistry(parsed) ? parsed : defaultRegistry();
  } catch {
    return defaultRegistry();
  }
}

/** Persist the registry to `vaults.json`, creating the config root if needed. */
export function saveRegistry(reg: VaultRegistry): void {
  mkdirSync(configRoot(), { recursive: true });
  writeFileSync(registryPath(), JSON.stringify(reg, null, 2) + "\n");
}

/** Directory of the active vault (holds its `vault.enc` + `.git`). */
export function activeVaultDir(): string {
  return activeEntry(loadRegistry())?.dir ?? configRoot();
}

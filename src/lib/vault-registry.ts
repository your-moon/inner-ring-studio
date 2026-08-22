/**
 * The registry of desktop vault-workspaces: the set of git-vaults on this machine
 * and which one is active. Each entry is its own directory (holding a `vault.enc`
 * + `.git`) with an optional git remote. Pure operations here; the file-backed
 * layer and path resolution sit on top (stage-5 slice 2).
 */

export interface VaultEntry {
  id: string;
  name: string;
  /** Directory holding this vault's `vault.enc` (+ `.git`). */
  dir: string;
  repoUrl?: string;
  branch?: string;
}

export interface VaultRegistry {
  active: string;
  vaults: VaultEntry[];
}

function assertName(reg: VaultRegistry, name: string, exceptId?: string): void {
  const clash = reg.vaults.some(
    (v) => v.id !== exceptId && v.name.toLowerCase() === name.toLowerCase()
  );
  if (clash) throw new Error(`A vault named "${name}" already exists.`);
}

/** Append a new vault. Throws on duplicate id or name. Does not change `active`. */
export function addVault(reg: VaultRegistry, entry: VaultEntry): VaultRegistry {
  if (reg.vaults.some((v) => v.id === entry.id)) {
    throw new Error(`Vault id "${entry.id}" already exists.`);
  }
  assertName(reg, entry.name);
  return { ...reg, vaults: [...reg.vaults, entry] };
}

/**
 * Remove a vault. Refuses to remove the last one. If the removed vault was
 * active, the first remaining vault becomes active.
 */
export function removeVault(reg: VaultRegistry, id: string): VaultRegistry {
  if (!reg.vaults.some((v) => v.id === id)) return reg;
  if (reg.vaults.length <= 1) {
    throw new Error("Can't remove the only vault.");
  }
  const vaults = reg.vaults.filter((v) => v.id !== id);
  const active = reg.active === id ? vaults[0].id : reg.active;
  return { active, vaults };
}

/** Switch the active vault. Throws if the id is unknown. */
export function setActive(reg: VaultRegistry, id: string): VaultRegistry {
  if (!reg.vaults.some((v) => v.id === id)) {
    throw new Error(`Unknown vault id "${id}".`);
  }
  return { ...reg, active: id };
}

/** Rename a vault. Throws on name collision. */
export function renameVault(
  reg: VaultRegistry,
  id: string,
  name: string
): VaultRegistry {
  assertName(reg, name, id);
  return {
    ...reg,
    vaults: reg.vaults.map((v) => (v.id === id ? { ...v, name } : v)),
  };
}

/** The active entry — or the first vault when `active` points nowhere valid. */
export function activeEntry(reg: VaultRegistry): VaultEntry | undefined {
  return reg.vaults.find((v) => v.id === reg.active) ?? reg.vaults[0];
}

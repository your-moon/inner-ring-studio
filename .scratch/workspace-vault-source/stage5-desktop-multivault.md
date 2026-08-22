# Stage 5 — Desktop multi-vault workspaces (Option A)

Each workspace on the desktop is its own git-vault repo, switchable, each
auto-syncing via the stage 1–4 engine. Passphrases never leave the machine.

## Model

```
VaultEntry    { id, name, dir, repoUrl?, branch? }   // one git-vault
VaultRegistry { active: string, vaults: VaultEntry[] }
```

Registry file: `~/.config/pmsql/vaults.json` (config root, NOT inside any vault
dir). Per-vault data lives at each entry's `dir` (its own `vault.enc` + `.git`).
Default when absent: a single "default" entry at `~/.config/pmsql` — the current
single vault, unchanged.

## Slices

1. ✅ **Registry core** (this slice): pure `addVault / removeVault / setActive /
   renameVault / activeEntry`, tested. The load-bearing state logic.
2. ✅ **File layer + path resolution** (`vault-registry-store.ts`): load/save
   `vaults.json` at `<config-root>/vaults.json`; `configRoot()` = `PMSQL_CONFIG_ROOT`
   ?? `~/.config/pmsql`. `vaultPath()` resolves to the active entry's
   `<dir>/vault.enc` (PMSQL_VAULT still pins a single vault, bypassing the
   registry — tests/single-vault). No `vaults.json` = implicit "default" entry in
   the config root, i.e. today's layout unchanged. Desktop `main.js` stops pinning
   PMSQL_VAULT and sets PMSQL_CONFIG_ROOT to its userData dir (keeps the existing
   `<userData>/vault.enc`). A corrupt/malformed registry falls back to default.
3. ✅ **API** (`vault-manager.ts` + `/api/vaults`): `listVaults` / `addVault`
   (create or link a remote repo) / `switchVault` / `forgetVault`. Forgetting
   unregisters but leaves files on disk; can't forget the last/only vault. Linking
   clones the remote into a fresh dir (`linkRepoInto`, split out of `linkRepo`).
   All vaults share the one machine passphrase. Route is cloud-guarded + auth'd.
4. ⬜ **UI**: a workspace switcher (sidebar) + manage screen.

## Notes

- Reuses the sync engine per active vault (each vault dir is its own git repo).
- "Or use cloud" = linked mode's cloud workspace, which already exists — this
  adds the vault-workspace side.

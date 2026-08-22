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
2. ⬜ **File layer + path resolution**: read/write vaults.json; `vaultPath()`
   resolves to the active entry's `<dir>/vault.enc` (PMSQL_VAULT still overrides,
   for tests/single-vault). Desktop main.js stops pinning PMSQL_VAULT.
3. ⬜ **API**: list / add (link repo or create) / switch / remove vault.
4. ⬜ **UI**: a workspace switcher (sidebar) + manage screen.

## Notes

- Reuses the sync engine per active vault (each vault dir is its own git repo).
- "Or use cloud" = linked mode's cloud workspace, which already exists — this
  adds the vault-workspace side.

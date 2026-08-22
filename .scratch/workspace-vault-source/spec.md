# Per-workspace connection source (cloud vs git-vault) + auto sync

## Goal

Let each **Workspace** choose where its connections live:

- **Cloud** — today's multi-tenant cloud store (`CloudConnectionStore`), shared via the cloud account.
- **Git vault** — a git-backed encrypted vault (its own repo), shared via that repo, with automatic push/pull.

Today the store is chosen **globally** by deploy mode (`getConnectionStore()` → `CloudConnectionStore` in cloud, else `VaultConnectionStore`). This makes it **per-workspace** instead.

## Why

- Team-shared connections → a **cloud** workspace.
- Repo-shared / project connections → a **git-vault** workspace: hand a teammate access to that one repo + passphrase and they get exactly those connections, auto-synced. Nothing else leaks.

## Design

### Workspace gains a connection source

```
Workspace.connectionSource: "cloud" | "vault"        // default: "cloud"
Workspace.vault?: {                                   // when source === "vault"
  repoUrl: string;          // git remote (e.g. github.com/you/team-db)
  branch: string;           // default "main"
  // passphrase is referenced, never stored in the workspace record
}
```

### Store resolution becomes per-workspace

`getConnectionStore()` → `getConnectionStore(workspace)`: returns the cloud store or a git-vault store bound to that workspace's repo/vault file. One vault file + one git clone per vault-workspace, under the app's config dir.

### Auto push/pull (vault-workspaces only)

- **Pull** on workspace-open (and on interval, optional).
- **Push** on change, debounced.
- **Conflict rule (LOCKED):** the vault re-encrypts on every write, so two machines produce unmergeable ciphertext. Sync therefore **merges on the DECRYPTED JSON, keyed by connection `id`** — never on the blob:
  - add/update: **last-writer-wins per id** by `updatedAt`.
  - delete: propagated via **tombstones** (`{id, deletedAt}`); an id is considered deleted when the latest tombstone's `deletedAt >= ` the connection's `updatedAt`.

### Data-model changes

- `VaultConnection` gains **`updatedAt: number`** (set on add/update).
- `VaultData` gains optional **`tombstones: {id, deletedAt}[]`** (a delete records a tombstone instead of just dropping the row).

### UI

Workspace settings → **Connection storage: Cloud | Git vault** (repo URL · branch · auto-sync toggle · "Sync now").

## Stages

1. ✅ **Merge core**: pure `mergeVaults(a, b)` (LWW-by-id + tombstones), tested.
2. ✅ **Vault model**: `updatedAt` + tombstones in `vault.ts`, back-compatible.
3. ✅ **Git-vault sync engine**: `syncVault` fetch→merge→write→push with retry, injectable ports, tested.
4. ✅ **Auto-sync wiring**: connection mutations + list reads trigger a throttled background `syncVaultNow`; the config `sync` action uses it too (replacing `git pull --rebase`). Delivers the desktop "auto push/pull" end-to-end.
5. ⬜ **Per-workspace source resolver + UI** (deferred): `getConnectionStore(workspace)` keyed on a workspace `connectionSource: "cloud" | "vault"`, plus the settings picker. **Blocked on a design decision**: a *cloud* workspace backing onto a git-vault means the cloud server clones/manages a repo and holds the vault passphrase per workspace — a security-sensitive infra subsystem that needs its own design. The desktop already *is* a git-vault, so stages 1–4 give it auto-sync today; this stage is the cloud-side + the per-workspace picker.

## Decisions

- Conflict resolution: **merge on decrypted JSON, LWW-per-id + tombstones** (not blob merge, not whole-file LWW). Confirmed with the user.

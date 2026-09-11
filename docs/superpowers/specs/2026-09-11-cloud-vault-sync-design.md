# Cloud ↔ Local Vault Connection Sync — Design

Status: draft for review · 2026-09-11

## Goal

When a local pmsql server is **linked** to a cloud account (`IS_LINKED`,
`cloud-link.ts`), keep that account's **personal** cloud workspace connections
in sync with the local vault's connections — two-way, last-writer-wins,
deletes included — so there is one list to maintain instead of two.

Out of scope, deliberately:
- **Shared/team workspaces.** Only the signed-in user's personal workspace
  syncs. Pushing local credentials into a workspace other people can see is a
  separate decision this spec doesn't make.
- **Working with no local server running.** The user confirmed their local
  server is always up when linked; this is not a live-tunnel / offline-access
  feature (that's the "Approach B" this spec explicitly did not choose).
- **Anything beyond `connections`.** Boards/comments/schedules already have
  their own forwarding path (`workspaceRoute`) and are untouched.

## Why this is safe to build the way it's built

Today, `storeRoute` (connections) hardcodes `forward: false` — a deliberate
boundary: "your data never proxies through the cloud". This spec crosses that
boundary on purpose, with the user's explicit sign-off, but doesn't create a
*new kind* of exposure: the cloud DB already stores a full copy of connection
credentials for every cloud/linked user (that's what `cloud-db.ts`'s
`connections` table is for). This makes that existing copy converge with the
local vault instead of drifting from it — it does not newly expose credentials
that weren't already leaving the machine once you sign into a cloud account.

## Mechanism: reuse `syncVault`, add a second `VaultSyncPorts`

`src/lib/vault-sync.ts` already has the whole hard part solved and tested:
`syncVault(ports, maxAttempts)` — fetch, merge via `mergeVaults` (tombstones,
last-writer-wins by `updatedAt`), write, push, retry on a concurrent write.
`defaultVaultPorts()` is the git-backed implementation of `VaultSyncPorts`.

This design adds a second implementation, `cloudVaultPorts()`, backed by HTTP
instead of git, and reuses `syncVault` unchanged:

```ts
// src/lib/cloud-vault-sync.ts
function cloudVaultPorts(): VaultSyncPorts {
  return {
    fetch: () => true, // no separate fetch step over HTTP
    readLocal: () => readVault(),
    readRemote: () => /* GET the workspace's raw connections + tombstones */,
    writeMerged: (merged) => writeVault(merged), // local write only; push does the remote side
    push: () => /* POST the merged set back, false on version conflict */,
  };
}
```

Zero changes to `syncVault`, `mergeVaults`, or their existing test coverage.

## Cloud side: one raw endpoint, workspace-scoped

New route, personal workspace only, authenticated by the existing cloud
session cookie (the same one `forwardToCloud` already sends) — **not**
forwarded anywhere itself, since it *is* the sync target. This is a
server-to-server call from the local process, not a browser SPA request, so
it always resolves the caller's own personal workspace (`workspaces.personal
= true AND owner_id = caller`) directly from the session — it ignores any
workspace-selector header/param a normal `workspaceRoute` request would carry,
so a client can never point this endpoint at a shared team workspace:

- `GET /api/workspace/connections/raw` → `{ connections, tombstones, version }`
  - `connections`: full rows (name, driver, host, port, database, db_user,
    password **decrypted**, ssl, read_only, folder, timezone, environment,
    id, created_at, updated_at) for the caller's personal workspace.
  - `version`: the workspace's current `connections_version` (below).
- `POST /api/workspace/connections/raw` body `{ connections, tombstones,
  expectedVersion }` → `200 { version }` or `409` on a version mismatch.
  - Upserts every connection by **id** (not the normal `add()`/`update()`
    path, which mints its own id — this must preserve whatever id the
    connection already has on either side).
  - Deletes any row whose id appears in `tombstones`.
  - Upserts the tombstone list.
  - All inside one transaction, gated by `WHERE connections_version =
    expectedVersion`; 0 rows affected on the version check → `409` → the
    existing retry loop in `syncVault` re-fetches and re-merges.

### Schema additions (`cloud-db.ts`, all idempotent like the existing migrations)

```sql
ALTER TABLE connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE connections SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE connections ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE connections ALTER COLUMN updated_at SET NOT NULL;
-- `environment` exists on VaultConnection but was never persisted in cloud
-- mode; add it now so a round trip through sync doesn't silently drop it.
ALTER TABLE connections ADD COLUMN IF NOT EXISTS environment TEXT;

CREATE TABLE IF NOT EXISTS connection_tombstones (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id           TEXT NOT NULL,
  deleted_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (workspace_id, id)
);

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS connections_version INTEGER NOT NULL DEFAULT 0;
```

Backfilling `updated_at` from `created_at` (not `now()`) matters: it's what
lets an old local tombstone correctly beat an old, stale cloud row on the
very first sync (see "Expected first-run effect" below) instead of the
migration accidentally making every existing cloud row look newer than it is.

## Local side: a second leg on the existing background sync

`scheduleBackgroundSync` already runs `syncVaultNow()` out of band after every
mutation and on every list read. It gets a sibling call, gated on
`IS_LINKED && getCloudSession() !== null`:

```ts
export function syncCloudVaultNow(): { ok: boolean; message: string } {
  if (!IS_LINKED || !getCloudSession()) return { ok: false, message: "not linked" };
  const r = syncVault(cloudVaultPorts());
  return { ok: r.pushed, message: r.pushed ? "synced" : `push failed after ${r.attempts} attempts` };
}
```

Both legs (git-vault, cloud-vault) run independently and can both be no-ops;
neither blocks the app on failure, matching the existing git-vault contract.

## Merge semantics — unchanged, reused as-is

`mergeVaults` already does exactly what's needed: last-writer-wins per
connection `id` by `updatedAt`; a tombstone wins when its `deletedAt >=` the
competing connection's `updatedAt`. No new merge logic, no new tests for the
merge itself — the 8 existing `vault-merge.test.ts` cases keep covering it.

**Known, accepted edge case:** if the same connection *name* was created
independently on both sides with different ids, both survive the merge as
distinct records and the cloud-side upsert hits the `UNIQUE(workspace_id,
name)` constraint. `push()` returns `false` for that attempt; after
`maxAttempts` retries `syncCloudVaultNow` reports failure rather than
corrupting either side. Not automatically resolved by this design — logged,
not silent.

## Expected first-run effect (worth calling out, not a bug)

The local vault already carries tombstones for the 8 connections deleted on
2026-08-28 (zahii-prod, zahii-dev, powerbank, powerbank-notify, kpi, ubcc,
concierge, real-estate). Cloud's copies of those same connections currently
have no tombstone at all — they were created 2026-08-21 and never touched
since. On the first sync, those tombstones' `deletedAt` (8/28) postdate the
backfilled cloud `updated_at` (8/21), so the tombstones win: **the first
sync run deletes those 8 stale rows from the cloud workspace**, which is
exactly the cleanup asked for earlier in this conversation — as a side effect
of turning sync on, not a separate manual step.

## Testing

- `cloud-vault-sync.test.ts`: unit-test `cloudVaultPorts()` against a fake
  HTTP layer (mirrors `vault-sync.test.ts`'s fake-`VaultSyncPorts` style) —
  confirms the adapter shape, not `syncVault` itself (already covered).
- `cloud-db.test.ts` (or extend existing cloud tests): the raw GET/POST route
  against a real test Postgres — upsert-by-id, tombstone delete, version
  conflict → 409, the name-collision case surfaces an error rather than
  silently dropping a row.
- One integration test exercising the real first-run scenario above (seed a
  local vault with tombstones + a cloud workspace with the pre-tombstone
  rows, run one sync, assert the cloud rows are gone) — same spirit as
  `vault-sync.integration.test.ts`, which already caught two real bugs in the
  git leg before this shipped.

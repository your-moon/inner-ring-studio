/**
 * Conflict-free merge of two decrypted vaults, for git-synced vault workspaces.
 *
 * The vault re-encrypts on every write (fresh salt/iv → the whole ciphertext
 * changes), so two machines that both edit a workspace produce blobs git cannot
 * merge. Instead we decrypt both sides and merge the JSON here, keyed by
 * connection `id`:
 *   - add / update: last-writer-wins per id, by `updatedAt`.
 *   - delete: carried as a tombstone `{ id, deletedAt }`; an id counts as deleted
 *     when its newest tombstone's `deletedAt >= ` the connection's `updatedAt`
 *     (so an edit made *after* a delete resurrects the connection).
 *   - name collision: two ids created independently on different peers can
 *     share a name before ever syncing. A second last-writer-wins pass, keyed
 *     by name, collapses these to one survivor -- every downstream consumer
 *     (the vault's own add-time guard, the cloud DB's unique constraint)
 *     only ever tolerates one connection per name anyway.
 *
 * The merge is commutative and idempotent: `merge(a, b)` deep-equals
 * `merge(b, a)`, and `merge(x, x)` equals `x` (normalized) — required, since two
 * peers must converge on the same result regardless of who pulls whom.
 */

// Only id + updatedAt are read; any other fields ride along untouched (the merge
// carries whole connection objects, it never inspects their contents). Kept free
// of an index signature so a concrete VaultConnection is structurally assignable.
export interface MergeableConnection {
  id: string;
  updatedAt: number;
}

export interface Tombstone {
  id: string;
  deletedAt: number;
}

export interface MergeableVault {
  connections: MergeableConnection[];
  tombstones?: Tombstone[];
}

function laterConnection(
  a: MergeableConnection | undefined,
  b: MergeableConnection | undefined
): MergeableConnection | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  // Same timestamp, different content: break the tie deterministically so the
  // merge stays commutative regardless of argument order.
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

function laterTombstone(
  a: Tombstone | undefined,
  b: Tombstone | undefined
): Tombstone | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.deletedAt >= b.deletedAt ? a : b;
}

export function mergeVaults(
  a: MergeableVault,
  b: MergeableVault
): Required<MergeableVault> {
  const connById = new Map<string, MergeableConnection>();
  const tombById = new Map<string, Tombstone>();

  for (const side of [a, b]) {
    for (const c of side.connections) {
      connById.set(c.id, laterConnection(connById.get(c.id), c)!);
    }
    for (const t of side.tombstones ?? []) {
      tombById.set(t.id, laterTombstone(tombById.get(t.id), t)!);
    }
  }

  const connections: MergeableConnection[] = [];
  const tombstones: Tombstone[] = [];
  const ids = new Set<string>([...connById.keys(), ...tombById.keys()]);

  for (const id of ids) {
    const conn = connById.get(id);
    const tomb = tombById.get(id);
    if (tomb && (!conn || tomb.deletedAt >= conn.updatedAt)) {
      tombstones.push(tomb);
    } else if (conn) {
      connections.push(conn);
    }
  }

  // Two peers can each create a connection with the SAME NAME before ever
  // syncing (add-time guards only stop a collision within one side; they
  // can't see the other side's unsynced state) -- different ids, so the
  // id-keyed pass above keeps both, and every consumer downstream enforces
  // one name per set: the local vault's own addConnection would refuse to
  // add either as a second copy, and the cloud DB's UNIQUE(workspace_id,
  // name) rejects the push outright -- confirmed live: this blocked every
  // subsequent sync attempt with a 409, forever, and the local write (which
  // happens before the doomed push) had already durably duplicated the row.
  // Same last-writer-wins rule as everything else here, just keyed by name
  // instead of id -- deterministic, so every peer converges on the same
  // survivor regardless of merge order, preserving this function's
  // commutative/idempotent contract for any input that doesn't already
  // carry a name collision (a well-formed single vault never does, since
  // add-time guards prevent it locally and via the DB constraint in cloud;
  // merging a vault that's already corrupted this way is exactly how it
  // gets repaired).
  const byName = new Map<string, MergeableConnection>();
  for (const c of connections) {
    const name = (c as { name?: unknown }).name;
    // No string name to key on (e.g. a test fixture) -- never collide.
    const key = typeof name === "string" ? `name:${name}` : `id:${c.id}`;
    byName.set(key, laterConnection(byName.get(key), c)!);
  }
  const deduped = [...byName.values()];

  // Stable ordering so the serialized result is identical on every peer.
  const byId = (x: { id: string }, y: { id: string }) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  deduped.sort(byId);
  tombstones.sort(byId);

  return { connections: deduped, tombstones };
}

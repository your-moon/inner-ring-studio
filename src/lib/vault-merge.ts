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

  // Stable ordering so the serialized result is identical on every peer.
  const byId = (x: { id: string }, y: { id: string }) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  connections.sort(byId);
  tombstones.sort(byId);

  return { connections, tombstones };
}

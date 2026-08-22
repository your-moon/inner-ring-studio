import {
  addConnection as vaultAdd,
  getConnection as vaultGet,
  listConnections as vaultList,
  removeConnection as vaultRemove,
  SafeConnection,
  updateConnection as vaultUpdate,
  VaultConnection,
} from "./vault";

/**
 * Who is making a request. `userId === null` is the single-tenant case
 * (desktop / self-hosted); a string id is a cloud account. In cloud mode
 * `workspaceId` names the active workspace resources are scoped to (membership
 * is verified before this context is built).
 */
export interface AuthContext {
  userId: string | null;
  workspaceId?: string | null;
  // Cloud role in the active workspace ("owner" | "editor" | "viewer"). Used to
  // enforce read-only for viewers; undefined in self-hosted/desktop.
  role?: string | null;
}

/** Fields accepted when creating a connection (no id/createdAt — the store sets those). */
export type NewConnection = Omit<
  VaultConnection,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Where connections live. The local implementation is the encrypted vault file
 * (single tenant); the cloud implementation is per-user rows in Postgres. Every
 * method takes the AuthContext so the cloud store can scope by user; the local
 * store ignores it.
 */
export interface ConnectionStore {
  list(ctx: AuthContext): Promise<SafeConnection[]>;
  get(ctx: AuthContext, id: string): Promise<VaultConnection | undefined>;
  add(ctx: AuthContext, conn: NewConnection): Promise<SafeConnection>;
  update(
    ctx: AuthContext,
    id: string,
    patch: Partial<NewConnection>
  ): Promise<SafeConnection | null>;
  remove(ctx: AuthContext, id: string): Promise<boolean>;
}

/** Single-tenant store backed by the encrypted vault file (desktop / self-hosted). */
export class VaultConnectionStore implements ConnectionStore {
  async list(): Promise<SafeConnection[]> {
    return vaultList();
  }
  async get(_ctx: AuthContext, id: string): Promise<VaultConnection | undefined> {
    return vaultGet(id);
  }
  async add(_ctx: AuthContext, conn: NewConnection): Promise<SafeConnection> {
    return vaultAdd(conn);
  }
  async update(
    _ctx: AuthContext,
    id: string,
    patch: Partial<NewConnection>
  ): Promise<SafeConnection | null> {
    return vaultUpdate(id, patch);
  }
  async remove(_ctx: AuthContext, id: string): Promise<boolean> {
    return vaultRemove(id);
  }
}

import { randomBytes } from "crypto";
import { Pool } from "pg";
import {
  AuthContext,
  ConnectionStore,
  NewConnection,
} from "./connection-store";
import { decryptSecret, encryptSecret } from "./crypto";
import { SafeConnection, VaultConnection } from "./vault";
import type { Tombstone } from "./vault-merge";

/**
 * Cloud-mode persistence: a dedicated Postgres holding user accounts and each
 * user's connections (DB passwords encrypted at rest). Only used when
 * DEPLOY_MODE=cloud. The connection to THIS database comes from IRS_CLOUD_DB_URL.
 */

const g = globalThis as unknown as { __irsCloudPool?: Pool };

function pool(): Pool {
  if (g.__irsCloudPool) return g.__irsCloudPool;
  const url = process.env.IRS_CLOUD_DB_URL;
  if (!url) throw new Error("IRS_CLOUD_DB_URL is not set (required in cloud mode).");
  g.__irsCloudPool = new Pool({ connectionString: url, max: 10 });
  return g.__irsCloudPool;
}

// Test-only: close the pool and reset schema state so jest can exit cleanly.
export async function _closeCloudPool(): Promise<void> {
  if (g.__irsCloudPool) {
    await g.__irsCloudPool.end().catch(() => {});
    g.__irsCloudPool = undefined;
  }
  schemaReady = false;
}

let schemaReady = false;
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await pool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Team workspaces: resources belong to a workspace, not a user. Every user
    -- gets a personal workspace; shared workspaces have multiple members.
    CREATE TABLE IF NOT EXISTS workspaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      personal   BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role         TEXT NOT NULL DEFAULT 'editor', -- owner | editor | viewer
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (workspace_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(user_id);

    -- Invite links: an email-bound token. Anyone can open the link, but only a
    -- signed-in user whose email matches can accept and join.
    CREATE TABLE IF NOT EXISTS workspace_invites (
      token        TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      email        TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'editor',
      created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      accepted_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_invites_ws ON workspace_invites(workspace_id);

    CREATE TABLE IF NOT EXISTS connections (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      driver       TEXT NOT NULL,
      host         TEXT NOT NULL,
      port         INTEGER NOT NULL,
      database     TEXT,
      db_user      TEXT,
      password_enc TEXT,
      ssl          BOOLEAN NOT NULL DEFAULT false,
      read_only    BOOLEAN NOT NULL DEFAULT false,
      folder       TEXT,
      timezone     TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, name)
    );

    -- Cloud-only: scheduled queries + alerts. A background ticker runs each
    -- enabled schedule against its connection, records a run, and raises an
    -- in-app notification when the alert rule trips.
    CREATE TABLE IF NOT EXISTS scheduled_queries (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      sql           TEXT NOT NULL,
      interval_min  INTEGER NOT NULL,
      alert_metric  TEXT NOT NULL DEFAULT 'rowcount', -- 'rowcount' | 'value'
      alert_op      TEXT,                              -- null | gt gte lt lte eq ne changed
      alert_value   DOUBLE PRECISION,
      enabled       BOOLEAN NOT NULL DEFAULT true,
      last_run_at   TIMESTAMPTZ,
      last_metric   DOUBLE PRECISION,                  -- for 'changed' comparisons
      next_run_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduled_queries(enabled, next_run_at);

    CREATE TABLE IF NOT EXISTS schedule_runs (
      id         TEXT PRIMARY KEY,
      sched_id   TEXT NOT NULL REFERENCES scheduled_queries(id) ON DELETE CASCADE,
      ran_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      status     TEXT NOT NULL,          -- 'ok' | 'error'
      row_count  INTEGER,
      metric_val DOUBLE PRECISION,
      alerted    BOOLEAN NOT NULL DEFAULT false,
      duration_ms INTEGER,
      error      TEXT,
      snapshot   JSONB                   -- { columns: string[], rows: unknown[][] } (first rows)
    );
    CREATE INDEX IF NOT EXISTS idx_runs_sched ON schedule_runs(sched_id, ran_at DESC);

    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL DEFAULT 'alert',
      title      TEXT NOT NULL,
      body       TEXT,
      sched_id   TEXT REFERENCES scheduled_queries(id) ON DELETE SET NULL,
      read       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read, created_at DESC);

    -- Cloud-only: dashboards (boards). The data column holds the full
    -- DashboardProps (charts + react-grid layout + filters) as JSON.
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      data       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id, updated_at DESC);

    -- Cloud-only: comments/annotations anchored to a table row (and optionally a
    -- single column) of a connection. row_key is a stable identity built from the
    -- row's primary key. Becomes team-shared once workspaces land.
    CREATE TABLE IF NOT EXISTS row_comments (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      table_ref     TEXT NOT NULL,
      row_key       TEXT NOT NULL,
      column_name   TEXT,
      body          TEXT NOT NULL,
      author_email  TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_row
      ON row_comments(connection_id, table_ref, row_key, created_at);

    -- Public shareable result snapshots. A static capture of a query's columns +
    -- rows, readable by anyone with the token (no login). Owned by a workspace so
    -- members can list/revoke them.
    CREATE TABLE IF NOT EXISTS shared_snapshots (
      token        TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      sql          TEXT,
      columns      JSONB NOT NULL,
      rows         JSONB NOT NULL,
      row_count    INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_snap_ws ON shared_snapshots(workspace_id, created_at DESC);

    -- Desktop link codes: one-time codes minted during browser-based sign-in so
    -- a desktop app can pick up a cloud session without the long-lived token
    -- ever appearing in a URL. Short-lived and single-use.
    CREATE TABLE IF NOT EXISTS link_codes (
      code       TEXT PRIMARY KEY,
      token      TEXT NOT NULL,
      email      TEXT NOT NULL,
      used       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Workspace migration: add workspace_id to every resource, then backfill
    -- each user's data into a personal workspace. All statements are idempotent
    -- (guarded by IF NOT EXISTS / IS NULL / NOT EXISTS), so this runs safely on
    -- every boot.
    ALTER TABLE connections       ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
    ALTER TABLE boards            ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
    ALTER TABLE scheduled_queries ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
    ALTER TABLE row_comments      ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_conn_ws    ON connections(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_boards_ws  ON boards(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_sched_ws   ON scheduled_queries(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_cmt_ws     ON row_comments(workspace_id);

    -- 1. a personal workspace for every user that lacks one
    INSERT INTO workspaces (id, name, owner_id, personal)
    SELECT gen_random_uuid()::text, 'Personal', u.id, true
      FROM users u
     WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.owner_id = u.id AND w.personal);

    -- 2. owner membership for every workspace owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, w.owner_id, 'owner'
      FROM workspaces w
     WHERE NOT EXISTS (
       SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
     );

    -- 3. move each user's existing resources into their personal workspace
    UPDATE connections c       SET workspace_id = (SELECT id FROM workspaces w WHERE w.owner_id = c.user_id AND w.personal LIMIT 1) WHERE c.workspace_id IS NULL;
    UPDATE boards b            SET workspace_id = (SELECT id FROM workspaces w WHERE w.owner_id = b.user_id AND w.personal LIMIT 1) WHERE b.workspace_id IS NULL;
    UPDATE scheduled_queries s SET workspace_id = (SELECT id FROM workspaces w WHERE w.owner_id = s.user_id AND w.personal LIMIT 1) WHERE s.workspace_id IS NULL;
    UPDATE row_comments r      SET workspace_id = (SELECT id FROM workspaces w WHERE w.owner_id = r.user_id AND w.personal LIMIT 1) WHERE r.workspace_id IS NULL;

    -- Connection names are unique PER WORKSPACE, not per user: the same database
    -- may live in two workspaces (e.g. importing it from Personal into a team
    -- workspace). Drop the old user-wide unique constraint and scope it to the
    -- workspace. Runs after the backfill so every row already has workspace_id.
    -- The inner block is guarded so a pre-existing duplicate (two members having
    -- named a connection the same in one shared workspace) can never break boot.
    ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_user_id_name_key;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connections_workspace_id_name_key') THEN
        BEGIN
          ALTER TABLE connections ADD CONSTRAINT connections_workspace_id_name_key UNIQUE (workspace_id, name);
        EXCEPTION WHEN unique_violation THEN
          RAISE NOTICE 'connections_workspace_id_name_key not added: duplicate names exist in a workspace';
        END;
      END IF;
    END $$;

    -- Cloud <-> local vault connection sync (linked mode, personal workspace
    -- only -- see docs/superpowers/specs/2026-09-11-cloud-vault-sync-design.md).
    -- updated_at backfills from created_at, NOT now(): an existing row must
    -- not look newer than it is, or a genuinely older local tombstone would
    -- lose to it on the very first sync.
    ALTER TABLE connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    UPDATE connections SET updated_at = created_at WHERE updated_at IS NULL;
    ALTER TABLE connections ALTER COLUMN updated_at SET DEFAULT now();
    ALTER TABLE connections ALTER COLUMN updated_at SET NOT NULL;
    -- environment exists on VaultConnection but was never persisted in cloud
    -- mode; add it so a sync round trip doesn't silently drop it.
    ALTER TABLE connections ADD COLUMN IF NOT EXISTS environment TEXT;

    CREATE TABLE IF NOT EXISTS connection_tombstones (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      id           TEXT NOT NULL,
      deleted_at   TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (workspace_id, id)
    );

    -- Optimistic concurrency for the raw sync endpoint: bumped on every
    -- successful merge write, checked-and-incremented atomically so two
    -- concurrent syncs can't silently clobber each other.
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS connections_version INTEGER NOT NULL DEFAULT 0;
  `);
  schemaReady = true;
}

/** Shared accessor for the cloud Postgres pool (used by schedules/notifications). */
export function cloudPool(): Pool {
  return pool();
}

/**
 * Connections in OTHER workspaces the user belongs to — candidates to import
 * into the active workspace (e.g. bring a Personal connection into a team one).
 */
export async function listImportableConnections(
  userId: string,
  currentWorkspaceId: string
): Promise<{ id: string; name: string; driver: string; workspaceName: string }[]> {
  await ensureSchema();
  const res = await pool().query(
    `SELECT c.id, c.name, c.driver, w.name AS workspace_name
       FROM connections c
       JOIN workspaces w ON w.id = c.workspace_id
       JOIN workspace_members m ON m.workspace_id = c.workspace_id AND m.user_id = $1
      WHERE c.workspace_id <> $2
      ORDER BY w.personal DESC, w.name, c.name`,
    [userId, currentWorkspaceId]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    driver: r.driver as string,
    workspaceName: r.workspace_name as string,
  }));
}

/**
 * Copy a connection (from any workspace the user belongs to) into the active
 * workspace. Credentials never leave the server — the encrypted password blob is
 * copied as-is (same IRS_CLOUD_KEY), so no decrypt/re-encrypt round trip.
 */
export async function importConnection(
  userId: string,
  currentWorkspaceId: string,
  sourceId: string
): Promise<SafeConnection | null> {
  await ensureSchema();
  const src = await pool().query(
    `SELECT c.* FROM connections c
       JOIN workspace_members m ON m.workspace_id = c.workspace_id AND m.user_id = $1
      WHERE c.id = $2`,
    [userId, sourceId]
  );
  const s = src.rows[0] as ConnRow | undefined;
  if (!s) return null;

  // Pick a name that doesn't collide in the target workspace — importing the
  // same connection twice just makes "name (2)", never an error.
  const existing = await pool().query(
    "SELECT name FROM connections WHERE workspace_id = $1",
    [currentWorkspaceId]
  );
  const taken = new Set(existing.rows.map((r: { name: string }) => r.name));
  let name = s.name;
  for (let n = 2; taken.has(name); n++) name = `${s.name} (${n})`;

  const id = newId();
  await pool().query(
    `INSERT INTO connections
       (id, user_id, workspace_id, name, driver, host, port, database, db_user,
        password_enc, ssl, read_only, folder, timezone)
     SELECT $1, $2, $3, $5, driver, host, port, database, db_user,
            password_enc, ssl, read_only, folder, timezone
       FROM connections WHERE id = $4`,
    [id, userId, currentWorkspaceId, sourceId, name]
  );
  return rowToSafe({ ...s, id, name });
}

/** Random opaque id, shared with the schedules module. */
export function cloudNewId(): string {
  return newId();
}

function newId(): string {
  return randomBytes(12).toString("hex");
}


// --------------------------- cloud connection store ---------------------------

interface ConnRow {
  id: string;
  name: string;
  driver: string;
  host: string;
  port: number;
  database: string | null;
  db_user: string | null;
  password_enc: string | null;
  ssl: boolean;
  read_only: boolean;
  folder: string | null;
  timezone: string | null;
  environment: string | null;
  // pg returns a Date by default, but the query route installs global timestamp
  // parsers that return raw strings — so tolerate either here.
  created_at: Date | string;
  updated_at: Date | string;
}

function rowToSafe(r: ConnRow): SafeConnection {
  return {
    id: r.id,
    name: r.name,
    driver: r.driver as VaultConnection["driver"],
    host: r.host,
    port: r.port,
    database: r.database ?? undefined,
    user: r.db_user ?? undefined,
    ssl: r.ssl,
    readOnly: r.read_only,
    folder: r.folder ?? undefined,
    timezone: r.timezone ?? undefined,
    environment: (r.environment as SafeConnection["environment"]) ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function requireUser(ctx: AuthContext): string {
  if (!ctx.userId) throw new Error("Cloud store requires an authenticated user.");
  return ctx.userId;
}

// Cloud connections are scoped to the active workspace (membership already
// verified when the context was built).
function requireWs(ctx: AuthContext): string {
  if (!ctx.workspaceId) throw new Error("Cloud store requires an active workspace.");
  return ctx.workspaceId;
}

export class CloudConnectionStore implements ConnectionStore {
  async list(ctx: AuthContext): Promise<SafeConnection[]> {
    await ensureSchema();
    const ws = requireWs(ctx);
    const res = await pool().query(
      "SELECT * FROM connections WHERE workspace_id = $1 ORDER BY created_at",
      [ws]
    );
    return (res.rows as ConnRow[]).map(rowToSafe);
  }

  async get(ctx: AuthContext, id: string): Promise<VaultConnection | undefined> {
    await ensureSchema();
    const ws = requireWs(ctx);
    // Scoped by workspace — a caller can only resolve connections in a workspace
    // they're a member of.
    const res = await pool().query(
      "SELECT * FROM connections WHERE id = $1 AND workspace_id = $2",
      [id, ws]
    );
    const r = res.rows[0] as ConnRow | undefined;
    if (!r) return undefined;
    return {
      ...rowToSafe(r),
      password: r.password_enc ? decryptSecret(r.password_enc) : undefined,
    };
  }

  async add(ctx: AuthContext, conn: NewConnection): Promise<SafeConnection> {
    await ensureSchema();
    const uid = requireUser(ctx);
    const ws = requireWs(ctx);
    const id = newId();
    try {
      await pool().query(
        `INSERT INTO connections
           (id, user_id, workspace_id, name, driver, host, port, database, db_user,
            password_enc, ssl, read_only, folder, timezone, environment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          id,
          uid,
          ws,
          conn.name,
          conn.driver,
          conn.host,
          conn.port,
          conn.database ?? null,
          conn.user ?? null,
          conn.password ? encryptSecret(conn.password) : null,
          conn.ssl ?? false,
          conn.readOnly ?? false,
          conn.folder ?? null,
          conn.timezone ?? null,
          conn.environment ?? null,
        ]
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") {
        throw new Error(`A connection named "${conn.name}" already exists.`);
      }
      throw e;
    }
    return (await this.list(ctx)).find((c) => c.id === id)!;
  }

  async update(
    ctx: AuthContext,
    id: string,
    patch: Partial<NewConnection>
  ): Promise<SafeConnection | null> {
    await ensureSchema();
    const ws = requireWs(ctx);
    const sets: string[] = [];
    const vals: unknown[] = [];
    const col = (c: string, v: unknown) => {
      sets.push(`${c} = $${sets.length + 1}`);
      vals.push(v);
    };
    if (patch.name !== undefined) col("name", patch.name);
    if (patch.host !== undefined) col("host", patch.host);
    if (patch.port !== undefined) col("port", patch.port);
    if (patch.database !== undefined) col("database", patch.database ?? null);
    if (patch.user !== undefined) col("db_user", patch.user ?? null);
    if (patch.ssl !== undefined) col("ssl", patch.ssl);
    if (patch.readOnly !== undefined) col("read_only", patch.readOnly);
    if (patch.folder !== undefined) col("folder", patch.folder ?? null);
    if (patch.timezone !== undefined) col("timezone", patch.timezone ?? null);
    if ("environment" in patch) col("environment", patch.environment ?? null);
    // Only overwrite the password when a non-empty one is provided.
    if (patch.password !== undefined && patch.password !== "") {
      col("password_enc", encryptSecret(patch.password));
    }
    if (sets.length === 0) {
      const rows = await this.list(ctx);
      return rows.find((c) => c.id === id) ?? null;
    }
    // Bump updated_at on every real change — this is what lets last-writer-wins
    // sync (cloud-vault-sync.ts) tell a fresh edit from a stale one.
    sets.push("updated_at = now()");
    vals.push(id, ws);
    const res = await pool().query(
      `UPDATE connections SET ${sets.join(", ")}
       WHERE id = $${vals.length - 1} AND workspace_id = $${vals.length}
       RETURNING *`,
      vals
    );
    const r = res.rows[0] as ConnRow | undefined;
    return r ? rowToSafe(r) : null;
  }

  async remove(ctx: AuthContext, id: string): Promise<boolean> {
    await ensureSchema();
    const ws = requireWs(ctx);
    const res = await pool().query(
      "DELETE FROM connections WHERE id = $1 AND workspace_id = $2",
      [id, ws]
    );
    const removed = (res.rowCount ?? 0) > 0;
    if (removed) {
      // A tombstone, not just a plain delete — without it, a linked local
      // vault that still has this connection would see it simply absent (not
      // marked deleted) on its next sync, and mergeVaults would resurrect it
      // right back into the cloud workspace.
      await pool().query(
        `INSERT INTO connection_tombstones (workspace_id, id, deleted_at)
         VALUES ($1, $2, now())
         ON CONFLICT (workspace_id, id) DO UPDATE SET deleted_at = now()`,
        [ws, id]
      );
    }
    return removed;
  }
}

// ----------------- raw connection sync (linked local vault <-> cloud) -----------------
//
// See docs/superpowers/specs/2026-09-11-cloud-vault-sync-design.md. Used only by
// the raw sync route (src/app/api/workspace/connections/raw/route.ts), called
// from a linked local server via cloud-vault-sync.ts — never by the browser
// SPA. Unlike the ConnectionStore CRUD above, this operates on the WHOLE
// connection set for a workspace at once, mirroring how the git-vault engine
// writes a whole merged file rather than issuing incremental ops.

export interface RawConnectionsPayload {
  connections: VaultConnection[];
  tombstones: Tombstone[];
  version: number;
}

function rowToRaw(r: ConnRow): VaultConnection {
  return {
    ...rowToSafe(r),
    password: r.password_enc ? decryptSecret(r.password_enc) : undefined,
  };
}

/** The workspace's full connection set + tombstones + version, decrypted. */
export async function getWorkspaceConnectionsRaw(
  workspaceId: string
): Promise<RawConnectionsPayload> {
  await ensureSchema();
  const connRes = await pool().query(
    "SELECT * FROM connections WHERE workspace_id = $1",
    [workspaceId]
  );
  const tombRes = await pool().query(
    "SELECT id, deleted_at FROM connection_tombstones WHERE workspace_id = $1",
    [workspaceId]
  );
  const wsRes = await pool().query(
    "SELECT connections_version FROM workspaces WHERE id = $1",
    [workspaceId]
  );
  return {
    connections: (connRes.rows as ConnRow[]).map(rowToRaw),
    tombstones: (tombRes.rows as { id: string; deleted_at: Date | string }[]).map(
      (t) => ({ id: t.id, deletedAt: new Date(t.deleted_at).getTime() })
    ),
    version: (wsRes.rows[0]?.connections_version as number) ?? 0,
  };
}

export interface ApplyMergeResult {
  ok: boolean;
  version: number;
  error?: string;
}

/**
 * Apply a merged connection set to the workspace, gated by an optimistic
 * version check (`expectedVersion` must match `workspaces.connections_version`
 * or nothing is written — the caller re-fetches and re-merges, same as a
 * non-fast-forward git push). Upserts every connection by id (never mints a
 * new one — ids must match across local and cloud for the merge to mean
 * anything) and applies every tombstone as a delete.
 */
export async function applyWorkspaceConnectionsMerge(
  workspaceId: string,
  ownerUserId: string,
  payload: { connections: VaultConnection[]; tombstones: Tombstone[]; expectedVersion: number }
): Promise<ApplyMergeResult> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const bump = await client.query(
      `UPDATE workspaces SET connections_version = connections_version + 1
        WHERE id = $1 AND connections_version = $2
        RETURNING connections_version`,
      [workspaceId, payload.expectedVersion]
    );
    if (bump.rowCount === 0) {
      await client.query("ROLLBACK");
      const cur = await pool().query(
        "SELECT connections_version FROM workspaces WHERE id = $1",
        [workspaceId]
      );
      return {
        ok: false,
        version: (cur.rows[0]?.connections_version as number) ?? 0,
        error: "version conflict",
      };
    }
    const newVersion = bump.rows[0].connections_version as number;

    const tombstoneIds = new Set(payload.tombstones.map((t) => t.id));
    for (const c of payload.connections) {
      if (tombstoneIds.has(c.id)) continue; // a tombstone for this id always wins
      await client.query(
        `INSERT INTO connections
           (id, user_id, workspace_id, name, driver, host, port, database, db_user,
            password_enc, ssl, read_only, folder, timezone, environment, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           workspace_id = $3, name = $4, driver = $5, host = $6, port = $7,
           database = $8, db_user = $9, password_enc = $10, ssl = $11,
           read_only = $12, folder = $13, timezone = $14, environment = $15,
           updated_at = $16`,
        [
          c.id,
          ownerUserId,
          workspaceId,
          c.name,
          c.driver,
          c.host,
          c.port,
          c.database ?? null,
          c.user ?? null,
          c.password ? encryptSecret(c.password) : null,
          c.ssl ?? false,
          c.readOnly ?? false,
          c.folder ?? null,
          c.timezone ?? null,
          c.environment ?? null,
          new Date(c.updatedAt),
        ]
      );
    }
    for (const t of payload.tombstones) {
      await client.query(
        "DELETE FROM connections WHERE id = $1 AND workspace_id = $2",
        [t.id, workspaceId]
      );
      await client.query(
        `INSERT INTO connection_tombstones (workspace_id, id, deleted_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id, id) DO UPDATE
           SET deleted_at = GREATEST(connection_tombstones.deleted_at, $3)`,
        [workspaceId, t.id, new Date(t.deletedAt)]
      );
    }
    await client.query("COMMIT");
    return { ok: true, version: newVersion };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    // Two names collided (same name, different ids, created independently on
    // both sides) — a known, accepted edge case per the design doc: surface
    // it rather than silently dropping one side's row.
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, version: payload.expectedVersion, error: "name collision" };
    }
    throw e;
  } finally {
    client.release();
  }
}

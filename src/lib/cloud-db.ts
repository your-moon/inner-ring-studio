import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { Pool } from "pg";
import {
  AuthContext,
  ConnectionStore,
  NewConnection,
} from "./connection-store";
import { decryptSecret, encryptSecret } from "./crypto";
import { SafeConnection, VaultConnection } from "./vault";

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
  const id = newId();
  try {
    await pool().query(
      `INSERT INTO connections
         (id, user_id, workspace_id, name, driver, host, port, database, db_user,
          password_enc, ssl, read_only, folder, timezone)
       SELECT $1, $2, $3, name, driver, host, port, database, db_user,
              password_enc, ssl, read_only, folder, timezone
         FROM connections WHERE id = $4`,
      [id, userId, currentWorkspaceId, sourceId]
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new Error(`A connection named "${s.name}" already exists in this workspace.`);
    throw e;
  }
  return rowToSafe({ ...s, id });
}

/** Random opaque id, shared with the schedules module. */
export function cloudNewId(): string {
  return newId();
}

function newId(): string {
  return randomBytes(12).toString("hex");
}

// --------------------------- users / auth ---------------------------

export interface CloudUser {
  id: string;
  email: string;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Create a user; throws if the email is already registered. Returns the new user. */
export async function createUser(
  email: string,
  password: string
): Promise<CloudUser> {
  await ensureSchema();
  const id = newId();
  const normalized = email.trim().toLowerCase();
  try {
    await pool().query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
      [id, normalized, hashPassword(password)]
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      throw new Error("An account with that email already exists.");
    }
    throw e;
  }
  // Give the new account a personal workspace + owner membership. The boot
  // migration only backfills users that existed when it ran, so a fresh signup
  // must provision its own — otherwise every workspace-scoped API 401s.
  const wsId = newId();
  await pool().query(
    "INSERT INTO workspaces (id, name, owner_id, personal) VALUES ($1, 'Personal', $2, true)",
    [wsId, id]
  );
  await pool().query(
    "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
    [wsId, id]
  );
  return { id, email: normalized };
}

/** Verify email+password; returns the user on success, null otherwise. */
export async function authenticateUser(
  email: string,
  password: string
): Promise<CloudUser | null> {
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const res = await pool().query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [normalized]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (!verifyHash(password, row.password_hash)) return null;
  return { id: row.id, email: row.email };
}

/** Look up a user by id (for the account page / session email). */
export async function getUserById(id: string): Promise<CloudUser | null> {
  await ensureSchema();
  const res = await pool().query("SELECT id, email FROM users WHERE id = $1", [id]);
  const row = res.rows[0];
  return row ? { id: row.id, email: row.email } : null;
}

/** Change a user's password after verifying the current one. */
export async function changePassword(
  id: string,
  current: string,
  next: string
): Promise<boolean> {
  await ensureSchema();
  const res = await pool().query(
    "SELECT password_hash FROM users WHERE id = $1",
    [id]
  );
  const row = res.rows[0];
  if (!row || !verifyHash(current, row.password_hash)) return false;
  await pool().query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hashPassword(next),
    id,
  ]);
  return true;
}

/** Delete a user (and, via ON DELETE CASCADE, all their connections). */
export async function deleteUser(id: string, password: string): Promise<boolean> {
  await ensureSchema();
  const res = await pool().query(
    "SELECT password_hash FROM users WHERE id = $1",
    [id]
  );
  const row = res.rows[0];
  if (!row || !verifyHash(password, row.password_hash)) return false;
  await pool().query("DELETE FROM users WHERE id = $1", [id]);
  return true;
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
  // pg returns a Date by default, but the query route installs global timestamp
  // parsers that return raw strings — so tolerate either here.
  created_at: Date | string;
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
    createdAt: new Date(r.created_at).getTime(),
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
            password_enc, ssl, read_only, folder, timezone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
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
    // Only overwrite the password when a non-empty one is provided.
    if (patch.password !== undefined && patch.password !== "") {
      col("password_enc", encryptSecret(patch.password));
    }
    if (sets.length === 0) {
      const rows = await this.list(ctx);
      return rows.find((c) => c.id === id) ?? null;
    }
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
    return (res.rowCount ?? 0) > 0;
  }
}

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
  `);
  schemaReady = true;
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

export class CloudConnectionStore implements ConnectionStore {
  async list(ctx: AuthContext): Promise<SafeConnection[]> {
    await ensureSchema();
    const uid = requireUser(ctx);
    const res = await pool().query(
      "SELECT * FROM connections WHERE user_id = $1 ORDER BY created_at",
      [uid]
    );
    return (res.rows as ConnRow[]).map(rowToSafe);
  }

  async get(ctx: AuthContext, id: string): Promise<VaultConnection | undefined> {
    await ensureSchema();
    const uid = requireUser(ctx);
    // Scoped by user_id — a caller can never resolve another user's connection.
    const res = await pool().query(
      "SELECT * FROM connections WHERE id = $1 AND user_id = $2",
      [id, uid]
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
    const id = newId();
    try {
      await pool().query(
        `INSERT INTO connections
           (id, user_id, name, driver, host, port, database, db_user,
            password_enc, ssl, read_only, folder, timezone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          uid,
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
    const uid = requireUser(ctx);
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
    vals.push(id, uid);
    const res = await pool().query(
      `UPDATE connections SET ${sets.join(", ")}
       WHERE id = $${vals.length - 1} AND user_id = $${vals.length}
       RETURNING *`,
      vals
    );
    const r = res.rows[0] as ConnRow | undefined;
    return r ? rowToSafe(r) : null;
  }

  async remove(ctx: AuthContext, id: string): Promise<boolean> {
    await ensureSchema();
    const uid = requireUser(ctx);
    const res = await pool().query(
      "DELETE FROM connections WHERE id = $1 AND user_id = $2",
      [id, uid]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

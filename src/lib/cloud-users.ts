import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";

/**
 * Cloud user accounts: creation, password verification, and account lifecycle.
 * Split out of cloud-db so the security-critical auth surface has its own home,
 * separate from the connection store and the schema bootstrap it shares a pool
 * with. All queries run against the cloud Postgres via cloudPool().
 */

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
  const id = cloudNewId();
  const normalized = email.trim().toLowerCase();
  try {
    await cloudPool().query(
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
  const wsId = cloudNewId();
  await cloudPool().query(
    "INSERT INTO workspaces (id, name, owner_id, personal) VALUES ($1, 'Personal', $2, true)",
    [wsId, id]
  );
  await cloudPool().query(
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
  const res = await cloudPool().query(
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
  const res = await cloudPool().query(
    "SELECT id, email FROM users WHERE id = $1",
    [id]
  );
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
  const res = await cloudPool().query(
    "SELECT password_hash FROM users WHERE id = $1",
    [id]
  );
  const row = res.rows[0];
  if (!row || !verifyHash(current, row.password_hash)) return false;
  await cloudPool().query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hashPassword(next),
    id,
  ]);
  return true;
}

/** Delete a user (and, via ON DELETE CASCADE, all their connections). */
export async function deleteUser(
  id: string,
  password: string
): Promise<boolean> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT password_hash FROM users WHERE id = $1",
    [id]
  );
  const row = res.rows[0];
  if (!row || !verifyHash(password, row.password_hash)) return false;
  await cloudPool().query("DELETE FROM users WHERE id = $1", [id]);
  return true;
}

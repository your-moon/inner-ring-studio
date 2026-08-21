import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";
import { getUserById } from "./cloud-users";
import { createSessionToken } from "./auth";

/**
 * One-time link codes for browser-based desktop sign-in (linked mode). The
 * desktop opens the cloud in a browser, the user consents, and a short-lived
 * code is exchanged server-to-server for a session token so the token never
 * rides in a URL. Split out of cloud-db as its own small lifecycle.
 */

/**
 * Mint a one-time link code for the signed-in cloud user. Stores a fresh session
 * token keyed by an opaque code; the desktop exchanges the code server-to-server.
 */
export async function createLinkCode(
  userId: string
): Promise<{ code: string; email: string } | null> {
  await ensureSchema();
  const u = await getUserById(userId);
  if (!u) return null;
  const token = await createSessionToken(userId);
  const code = cloudNewId() + cloudNewId();
  await cloudPool().query(
    "INSERT INTO link_codes (code, token, email) VALUES ($1, $2, $3)",
    [code, token, u.email]
  );
  return { code, email: u.email };
}

/**
 * Redeem a link code (single-use, 5-minute TTL). The UPDATE...RETURNING marks it
 * used atomically, so a replayed code returns nothing.
 */
export async function consumeLinkCode(
  code: string
): Promise<{ token: string; email: string } | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    `UPDATE link_codes SET used = true
      WHERE code = $1 AND used = false AND created_at > now() - interval '5 minutes'
      RETURNING token, email`,
    [code]
  );
  const r = res.rows[0] as { token: string; email: string } | undefined;
  return r ?? null;
}

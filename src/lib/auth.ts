import { cookies } from "next/headers";

/**
 * App-level authentication for hosted deployments.
 *
 * Enabled only when PMSQL_AUTH_PASSWORD is set (local runs stay login-free).
 * A successful login gets an HMAC-signed session cookie. The signing key is
 * derived from the password, so rotating the password invalidates sessions.
 *
 * The security boundary is the API routes (Node runtime, reliable env access) —
 * every data route calls requireAuth(). Uses Web Crypto so the same code works
 * in any runtime.
 */

export const SESSION_COOKIE = "irs_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const KEY_SALT = "inner-ring-studio.session.v1";

export function authEnabled(): boolean {
  return Boolean(process.env.PMSQL_AUTH_PASSWORD);
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function toB64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signingKey(): Promise<CryptoKey> {
  const secret = (process.env.PMSQL_AUTH_PASSWORD ?? "") + KEY_SALT;
  const digest = await crypto.subtle.digest("SHA-256", enc(secret));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Constant-time password comparison against PMSQL_AUTH_PASSWORD. */
export function verifyPassword(password: string): boolean {
  const expected = process.env.PMSQL_AUTH_PASSWORD ?? "";
  if (!expected) return false;
  const a = enc(password);
  const b = enc(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Cloud mode carries a user id in the session; local mode uses null. */
export function isCloud(): boolean {
  return process.env.DEPLOY_MODE === "cloud";
}

export async function createSessionToken(userId?: string | null): Promise<string> {
  const payload = toB64Url(
    enc(JSON.stringify({ userId: userId ?? null, exp: Date.now() + SESSION_TTL_MS }))
  );
  const sig = toB64Url(await crypto.subtle.sign("HMAC", await signingKey(), enc(payload)));
  return `${payload}.${sig}`;
}

/**
 * Verify a session token's signature + expiry. Returns the decoded payload
 * ({ userId }) on success, or null when missing/forged/expired.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<{ userId: string | null } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const valid = await crypto.subtle
    .verify("HMAC", await signingKey(), fromB64Url(sig), enc(payload))
    .catch(() => false);
  if (!valid) return null;
  try {
    const { exp, userId } = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    if (typeof exp !== "number" || exp <= Date.now()) return null;
    return { userId: typeof userId === "string" ? userId : null };
  } catch {
    return null;
  }
}

/**
 * Resolve the caller from the session cookie.
 * - cloud: requires a valid token carrying a userId → { userId }.
 * - self-hosted with a password: requires a valid token → { userId: null }.
 * - self-hosted/desktop with no password: open → { userId: null }.
 * Returns null when unauthorized.
 */
export async function getAuthContext(): Promise<{ userId: string | null } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (isCloud()) {
    const payload = await verifySessionToken(token);
    return payload?.userId ? { userId: payload.userId } : null;
  }
  if (!authEnabled()) return { userId: null };
  const payload = await verifySessionToken(token);
  return payload ? { userId: null } : null;
}

/** True if the current request carries a valid session (or auth is disabled). */
export async function isAuthed(): Promise<boolean> {
  return (await getAuthContext()) !== null;
}

/**
 * Guard for API route handlers. Returns the AuthContext when allowed, or a 401
 * Response to return immediately when not. Usage:
 *   const auth = await requireAuth();
 *   if (auth instanceof Response) return auth;
 *   // auth.userId is available
 */
export async function requireAuth(): Promise<{ userId: string | null } | Response> {
  const ctx = await getAuthContext();
  if (ctx) return ctx;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

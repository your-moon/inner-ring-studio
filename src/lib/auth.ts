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

export async function createSessionToken(): Promise<string> {
  const payload = toB64Url(enc(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })));
  const sig = toB64Url(await crypto.subtle.sign("HMAC", await signingKey(), enc(payload)));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const valid = await crypto.subtle
    .verify("HMAC", await signingKey(), fromB64Url(sig), enc(payload))
    .catch(() => false);
  if (!valid) return false;
  try {
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** True if the current request carries a valid session (or auth is disabled). */
export async function isAuthed(): Promise<boolean> {
  if (!authEnabled()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Guard for API route handlers. Returns null when allowed, or a 401 Response to
 * return immediately when not.
 */
export async function requireAuth(): Promise<Response | null> {
  if (await isAuthed()) return null;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

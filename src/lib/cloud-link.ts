import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

/**
 * "Linked" mode (desktop): the local server keeps resolving connections and
 * running queries LOCALLY (direct to the DB, from the vault), but forwards the
 * collaborative cloud features (boards, schedules, comments, workspaces,
 * notifications, shares) to a remote cloud account. Your data never proxies
 * through the cloud — only the collaboration metadata does.
 *
 * Enabled when IRS_CLOUD_LINK points at a remote cloud URL and we're not
 * ourselves the cloud. The remote session cookie is stored in a small file next
 * to the vault so it survives restarts.
 */

const LINK_URL = process.env.IRS_CLOUD_LINK?.replace(/\/$/, "");
export const IS_LINKED = !!LINK_URL && process.env.DEPLOY_MODE !== "cloud";

export function cloudLinkUrl(): string | null {
  return LINK_URL ?? null;
}

interface CloudSession {
  cookie: string;
  email: string;
}

function sessionFile(): string {
  return (
    process.env.IRS_CLOUD_SESSION_FILE ||
    join(homedir(), ".config", "pmsql", "cloud-session.json")
  );
}

/**
 * The session cookie is `irs_session=<payload>.<sig>`, where `<payload>` is a
 * base64url-encoded `{ userId, exp }` JSON blob (see auth.ts). We have no way
 * to verify the signature client-side (that needs the cloud's server-side
 * signing key) -- but decoding `exp` locally is enough to stop treating an
 * obviously-expired session as valid. The server still authoritatively
 * checks signature + expiry on every real request regardless; this is only
 * about not lying to the caller (and to `/api/cloud-link`'s "signedIn") when
 * the session has already expired.
 */
function isExpired(cookie: string): boolean {
  try {
    const token = cookie.replace(/^irs_session=/, "");
    const payload = token.split(".")[0];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === "number" && exp <= Date.now();
  } catch {
    // Can't parse it -- let the real request fail on its own terms rather
    // than guess.
    return false;
  }
}

export function getCloudSession(): CloudSession | null {
  try {
    const f = sessionFile();
    if (!existsSync(f)) return null;
    const j = JSON.parse(readFileSync(f, "utf8"));
    if (!j.cookie || !j.email) return null;
    if (isExpired(j.cookie)) return null;
    return j as CloudSession;
  } catch {
    return null;
  }
}

export function setCloudSession(s: CloudSession): void {
  const f = sessionFile();
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(s), { mode: 0o600 });
}

export function clearCloudSession(): void {
  try {
    const f = sessionFile();
    if (existsSync(f)) writeFileSync(f, JSON.stringify({}), { mode: 0o600 });
  } catch {
    /* ignore */
  }
}

/**
 * Forward an incoming API request verbatim to the linked cloud, carrying the
 * stored cloud session cookie. Same path + method + body; the local client never
 * sees the cloud origin (no CORS, cookie stays server-side).
 */
export async function forwardToCloud(req: Request): Promise<Response> {
  if (!LINK_URL) {
    return new Response(JSON.stringify({ error: "Not linked to a cloud." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const session = getCloudSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Sign in to your cloud account first.", needLogin: true }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const target = LINK_URL + url.pathname + url.search;
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const res = await fetch(target, {
    method: req.method,
    headers: { "Content-Type": "application/json", Cookie: session.cookie },
    body,
  }).catch(() => null);
  if (!res) {
    return new Response(JSON.stringify({ error: "Cloud unreachable." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

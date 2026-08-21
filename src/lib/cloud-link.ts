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

export function getCloudSession(): CloudSession | null {
  try {
    const f = sessionFile();
    if (!existsSync(f)) return null;
    const j = JSON.parse(readFileSync(f, "utf8"));
    return j.cookie && j.email ? (j as CloudSession) : null;
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

/**
 * Wrap a cloud-feature route handler so that, in linked (desktop) mode, the
 * request is forwarded to the cloud instead of served locally — hoisting the
 * `if (IS_LINKED) return forwardToCloud(req)` line that every such handler used
 * to repeat. Passes the App Router args (req, { params }) through untouched.
 * A cloud route that isn't wrapped runs locally, so wrap every one.
 */
export function withCloudForward<A extends unknown[]>(
  handler: (req: Request, ...args: A) => Promise<Response>
): (req: Request, ...args: A) => Promise<Response> {
  return async (req, ...args) => {
    if (IS_LINKED) return forwardToCloud(req);
    return handler(req, ...args);
  };
}

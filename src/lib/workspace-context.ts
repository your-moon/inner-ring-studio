import { cookies } from "next/headers";
import { getAuthContext, requireAuth } from "./auth";
import { IS_CLOUD } from "./mode";
import type { AuthContext } from "./connection-store";
import { getRole, personalWorkspaceId, type Role } from "./workspaces";

/**
 * Resolves the caller's ACTIVE workspace (cloud mode). The active workspace id
 * lives in the `irs_ws` cookie; membership is always re-verified here, and we
 * fall back to the user's personal workspace when the cookie is missing/invalid.
 */

export const WORKSPACE_COOKIE = "irs_ws";

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  role: Role;
}

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const auth = await getAuthContext();
  if (!auth?.userId) return null;
  const cookieWs = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (cookieWs) {
    const role = await getRole(auth.userId, cookieWs);
    if (role) return { userId: auth.userId, workspaceId: cookieWs, role };
  }
  const personal = await personalWorkspaceId(auth.userId);
  if (!personal) return null;
  const role = (await getRole(auth.userId, personal)) ?? "owner";
  return { userId: auth.userId, workspaceId: personal, role };
}

/** Guard for cloud API routes: returns the context or a 401 Response. */
export async function requireWorkspace(): Promise<WorkspaceContext | Response> {
  const ctx = await getWorkspaceContext();
  if (ctx) return ctx;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

/**
 * The AuthContext the ConnectionStore expects. In cloud mode it carries the
 * active workspace id (resources are workspace-scoped); in self-hosted/desktop
 * it's the plain single-tenant context. Drop-in for `requireAuth()` in the
 * connection/query/db routes.
 */
export async function requireStoreContext(): Promise<AuthContext | Response> {
  if (!IS_CLOUD) return requireAuth();
  const ws = await getWorkspaceContext();
  if (ws) return { userId: ws.userId, workspaceId: ws.workspaceId, role: ws.role };
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

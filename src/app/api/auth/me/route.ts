import { NextResponse } from "next/server";
import { authEnabled, getAuthContext } from "@/lib/auth";
import { getUserById } from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { listMyWorkspaces } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  let email: string | null = null;
  let workspaceId: string | null = null;
  let workspaceName: string | null = null;
  let workspacePersonal = false;
  let role: string | null = null;
  if (IS_CLOUD && ctx?.userId) {
    email = (await getUserById(ctx.userId).catch(() => null))?.email ?? null;
    const ws = await getWorkspaceContext().catch(() => null);
    if (ws) {
      workspaceId = ws.workspaceId;
      role = ws.role;
      const mine = await listMyWorkspaces(ctx.userId).catch(() => []);
      const active = mine.find((w) => w.id === ws.workspaceId);
      workspaceName = active?.name ?? null;
      workspacePersonal = active?.personal ?? false;
    }
  }
  return NextResponse.json({
    mode: IS_CLOUD ? "cloud" : "selfhosted",
    // In cloud mode, login (email+password) is always required.
    authEnabled: IS_CLOUD || authEnabled(),
    authed: ctx !== null,
    userId: ctx?.userId ?? null,
    email,
    workspaceId,
    workspaceName,
    workspacePersonal,
    role,
  });
}

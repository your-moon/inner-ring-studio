import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { getRole } from "@/lib/workspaces";
import { WORKSPACE_COOKIE } from "@/lib/workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set the active workspace cookie after verifying membership. */
export async function POST(req: Request) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { workspaceId?: string };
  const workspaceId = body.workspaceId ?? "";
  if (!workspaceId || !(await getRole(auth.userId, workspaceId)))
    return NextResponse.json({ error: "Not a member of that workspace." }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

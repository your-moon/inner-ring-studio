import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getUserById } from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";
import { acceptInvite, getInvite } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Invite details for the accept page (requires the invitee to be signed in). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) return NextResponse.json({ error: "Invalid invite." }, { status: 404 });
  const me = await getUserById(auth.userId);
  return NextResponse.json({
    workspaceName: invite.workspaceName,
    email: invite.email,
    role: invite.role,
    accepted: invite.accepted,
    matches: me?.email?.toLowerCase() === invite.email,
    myEmail: me?.email ?? null,
  });
}

/** Accept the invite (email must match the signed-in user). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { token } = await params;
  const me = await getUserById(auth.userId);
  const r = await acceptInvite(token, auth.userId, me?.email ?? "");
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, workspaceId: r.workspaceId });
}

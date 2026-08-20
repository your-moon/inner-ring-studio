import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  listMembers,
  removeMember,
  setMemberRole,
  type Role,
} from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["owner", "editor", "viewer"];

async function userId(): Promise<string | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return auth.userId;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(_req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const members = await listMembers(uid, id);
  if (!members) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ members });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { memberId?: string; role?: Role };
  if (!body.memberId || !ROLES.includes(body.role as Role))
    return NextResponse.json({ error: "memberId and a valid role are required." }, { status: 400 });
  const ok = await setMemberRole(uid, id, body.memberId, body.role as Role);
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const ok = await removeMember(uid, id, memberId);
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok });
}

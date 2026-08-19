import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  addMemberByEmail,
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
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const members = await listMembers(uid, id);
  if (!members) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ members });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
  const email = body.email?.trim();
  const role = ROLES.includes(body.role as Role) ? (body.role as Role) : "editor";
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  const r = await addMemberByEmail(uid, id, email, role);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const ok = await removeMember(uid, id, memberId);
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok });
}

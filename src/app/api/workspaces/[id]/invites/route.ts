import { NextResponse } from "next/server";
import { withCloudForward } from "@/lib/cloud-link";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { createInvite, type Role } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["owner", "editor", "viewer"];

export const POST = withCloudForward(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
  const email = body.email?.trim();
  const role = ROLES.includes(body.role as Role) ? (body.role as Role) : "editor";
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  const r = await createInvite(auth.userId, id, email, role);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ token: r.token, addedDirectly: r.addedDirectly });
});

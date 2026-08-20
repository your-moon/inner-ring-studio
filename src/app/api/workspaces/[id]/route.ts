import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { deleteWorkspace, renameWorkspace } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId(): Promise<string | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return auth.userId;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const ok = await renameWorkspace(uid, id, name);
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(_req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const ok = await deleteWorkspace(uid, id);
  if (!ok)
    return NextResponse.json(
      { error: "Only the owner can delete a shared workspace." },
      { status: 403 }
    );
  return NextResponse.json({ ok });
}

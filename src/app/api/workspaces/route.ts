import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { getAuthContext } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { createWorkspace, listMyWorkspaces } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId(): Promise<string | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Workspaces are a Cloud feature." }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth?.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return auth.userId;
}

export async function GET(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const workspaces = await listMyWorkspaces(uid);
  return NextResponse.json({ workspaces });
}

export async function POST(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  const uid = await userId();
  if (uid instanceof Response) return uid;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const workspace = await createWorkspace(uid, name);
  return NextResponse.json({ workspace });
}

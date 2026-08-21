import { NextResponse } from "next/server";
import { withCloudForward } from "@/lib/cloud-link";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace, type WorkspaceContext } from "@/lib/workspace-context";
import { roleAtLeast } from "@/lib/workspaces";
import { deleteBoard, getBoard, updateBoard } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<WorkspaceContext | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  return requireWorkspace();
}

export const GET = withCloudForward(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const board = await getBoard(g.workspaceId, id);
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ board });
});

export const PUT = withCloudForward(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const g = await guard();
  if (g instanceof Response) return g;
  if (!roleAtLeast(g.role, "editor"))
    return NextResponse.json({ error: "Viewers can't edit boards." }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    data?: Record<string, unknown>;
  };
  const board = await updateBoard(g.workspaceId, id, {
    name: body.name,
    data: body.data,
  });
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ board });
});

export const DELETE = withCloudForward(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const g = await guard();
  if (g instanceof Response) return g;
  if (!roleAtLeast(g.role, "editor"))
    return NextResponse.json({ error: "Viewers can't delete boards." }, { status: 403 });
  const { id } = await params;
  const ok = await deleteBoard(g.workspaceId, id);
  return NextResponse.json({ ok });
});

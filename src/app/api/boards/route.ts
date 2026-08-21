import { NextResponse } from "next/server";
import { withCloudForward } from "@/lib/cloud-link";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace, type WorkspaceContext } from "@/lib/workspace-context";
import { roleAtLeast } from "@/lib/workspaces";
import { createBoard, listBoards } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<WorkspaceContext | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Boards are a Cloud feature." }, { status: 404 });
  return requireWorkspace();
}

export const GET = withCloudForward(async (_req: Request) => {
  const g = await guard();
  if (g instanceof Response) return g;
  const boards = await listBoards(g.workspaceId);
  return NextResponse.json({ boards });
});

export const POST = withCloudForward(async (req: Request) => {
  const g = await guard();
  if (g instanceof Response) return g;
  if (!roleAtLeast(g.role, "editor"))
    return NextResponse.json({ error: "Viewers can't create boards." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    data?: Record<string, unknown>;
  };
  // Import: a board name embedded in the blob wins when no explicit name given.
  const embeddedName =
    body.data && typeof body.data.name === "string" ? (body.data.name as string) : undefined;
  const name = body.name?.trim() || embeddedName?.trim() || "Untitled board";
  const board = await createBoard(g.workspaceId, g.userId, name, body.data);
  return NextResponse.json({ board });
});

import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace, type WorkspaceContext } from "@/lib/workspace-context";
import { addComment, deleteComment, listComments } from "@/lib/comments";
import { getUserById } from "@/lib/cloud-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<WorkspaceContext | Response> {
  if (!IS_CLOUD)
    // Not an error: lets the client render nothing and treat comments as a
    // Cloud-only capability without special-casing the request.
    return NextResponse.json({ cloud: false, comments: [] });
  return requireWorkspace();
}

export async function GET(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  const g = await guard();
  if (g instanceof Response) return g;
  const url = new URL(req.url);
  const connectionId = url.searchParams.get("connectionId") ?? "";
  const table = url.searchParams.get("table") ?? "";
  const rowKey = url.searchParams.get("rowKey") ?? "";
  if (!connectionId || !table || !rowKey)
    return NextResponse.json({ cloud: true, comments: [] });
  const comments = await listComments(g.workspaceId, g.userId, connectionId, table, rowKey);
  return NextResponse.json({ cloud: true, comments });
}

export async function POST(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  const g = await guard();
  if (g instanceof Response) return g;
  // Any member (viewer included) can comment — that's the collaboration point.
  const body = (await req.json().catch(() => ({}))) as {
    connectionId?: string;
    table?: string;
    rowKey?: string;
    columnName?: string | null;
    body?: string;
  };
  const text = body.body?.trim();
  if (!body.connectionId || !body.table || !body.rowKey || !text)
    return NextResponse.json(
      { error: "connectionId, table, rowKey, and body are required." },
      { status: 400 }
    );
  const user = await getUserById(g.userId);
  try {
    const comment = await addComment(g.workspaceId, g.userId, user?.email ?? null, {
      connectionId: body.connectionId,
      tableRef: body.table,
      rowKey: body.rowKey,
      columnName: body.columnName ?? null,
      body: text,
    });
    return NextResponse.json({ comment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  const g = await guard();
  if (g instanceof Response) return g;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteComment(g.userId, id);
  return NextResponse.json({ ok });
}

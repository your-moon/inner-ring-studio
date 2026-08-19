import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { addComment, deleteComment, listComments } from "@/lib/comments";
import { getUserById } from "@/lib/cloud-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<{ userId: string } | Response> {
  if (!IS_CLOUD)
    // Not an error: lets the client render nothing and treat comments as a
    // Cloud-only capability without special-casing the request.
    return NextResponse.json({ cloud: false, comments: [] });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { userId: auth.userId };
}

export async function GET(req: Request) {
  const g = await guard();
  if (g instanceof Response) return g;
  const url = new URL(req.url);
  const connectionId = url.searchParams.get("connectionId") ?? "";
  const table = url.searchParams.get("table") ?? "";
  const rowKey = url.searchParams.get("rowKey") ?? "";
  if (!connectionId || !table || !rowKey)
    return NextResponse.json({ cloud: true, comments: [] });
  const comments = await listComments(g.userId, connectionId, table, rowKey);
  return NextResponse.json({ cloud: true, comments });
}

export async function POST(req: Request) {
  const g = await guard();
  if (g instanceof Response) return g;
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
    const comment = await addComment(g.userId, user?.email ?? null, {
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
  const g = await guard();
  if (g instanceof Response) return g;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteComment(g.userId, id);
  return NextResponse.json({ ok });
}

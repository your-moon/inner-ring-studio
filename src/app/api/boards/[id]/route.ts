import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { deleteBoard, getBoard, updateBoard } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<{ userId: string } | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { userId: auth.userId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const board = await getBoard(g.userId, id);
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    data?: Record<string, unknown>;
  };
  const board = await updateBoard(g.userId, id, {
    name: body.name,
    data: body.data,
  });
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const ok = await deleteBoard(g.userId, id);
  return NextResponse.json({ ok });
}

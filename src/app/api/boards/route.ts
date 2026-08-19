import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { createBoard, listBoards } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<{ userId: string } | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Boards are a Cloud feature." }, { status: 404 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { userId: auth.userId };
}

export async function GET() {
  const g = await guard();
  if (g instanceof Response) return g;
  const boards = await listBoards(g.userId);
  return NextResponse.json({ boards });
}

export async function POST(req: Request) {
  const g = await guard();
  if (g instanceof Response) return g;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() || "Untitled board";
  const board = await createBoard(g.userId, name);
  return NextResponse.json({ board });
}

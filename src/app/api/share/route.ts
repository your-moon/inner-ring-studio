import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace } from "@/lib/workspace-context";
import { createSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a public snapshot from a query result. Any workspace member may share. */
export async function POST(req: Request) {
  if (IS_LINKED) return forwardToCloud(req);
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Sharing is a Cloud feature." }, { status: 404 });
  const ctx = await requireWorkspace();
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    sql?: string;
    columns?: string[];
    rows?: unknown[][];
  };
  if (!Array.isArray(body.columns) || !Array.isArray(body.rows))
    return NextResponse.json({ error: "columns and rows are required." }, { status: 400 });
  const { token } = await createSnapshot(ctx.workspaceId, ctx.userId, {
    title: (body.title ?? "").trim() || "Shared result",
    sql: body.sql ?? null,
    columns: body.columns,
    rows: body.rows,
  });
  return NextResponse.json({ token });
}

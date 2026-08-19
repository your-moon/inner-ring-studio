import { NextResponse } from "next/server";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace } from "@/lib/workspace-context";
import { deleteSnapshot, getSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUBLIC: fetch a shared snapshot by token. No auth — the token is the key. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const { token } = await params;
  const snapshot = await getSnapshot(token);
  if (!snapshot) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ snapshot });
}

/** Revoke a snapshot (must be a member of the owning workspace). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const ctx = await requireWorkspace();
  if (ctx instanceof Response) return ctx;
  const { token } = await params;
  const ok = await deleteSnapshot(ctx.workspaceId, token);
  return NextResponse.json({ ok });
}

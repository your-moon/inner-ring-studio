import { NextResponse } from "next/server";
import { requireStoreContext } from "@/lib/workspace-context";
import { IS_CLOUD } from "@/lib/mode";
import { listImportableConnections, importConnection } from "@/lib/cloud-db";

// Reads/writes the cloud DB — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List connections in the caller's OTHER workspaces — candidates to import into
 * the active workspace. Cloud-only (the single-tenant vault has no workspaces).
 */
export async function GET() {
  if (!IS_CLOUD) return NextResponse.json({ connections: [] });
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  if (!auth.userId || !auth.workspaceId) return NextResponse.json({ connections: [] });
  const connections = await listImportableConnections(auth.userId, auth.workspaceId);
  return NextResponse.json({ connections });
}

/** Copy a connection (from any workspace the caller belongs to) into this one. */
export async function POST(req: Request) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Importing needs Cloud." }, { status: 400 });
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  if (auth.role === "viewer")
    return NextResponse.json({ error: "Viewers can't add connections." }, { status: 403 });
  if (!auth.userId || !auth.workspaceId)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { sourceId } = await req.json();
    if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });
    const safe = await importConnection(auth.userId, auth.workspaceId, sourceId);
    if (!safe)
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    return NextResponse.json({ ok: true, connection: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

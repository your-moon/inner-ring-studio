import { NextResponse } from "next/server";
import {
  addConnection,
  getConnection,
  listConnections,
  removeConnection,
  updateConnection,
} from "@/lib/vault";
import { requireAuth } from "@/lib/auth";
import { commitConfig } from "@/lib/config-repo";

// Reads the encrypted vault (fs + crypto) — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List connections stored in the server-side vault, with passwords stripped.
 * The browser uses these to populate its connection list; the actual password
 * never leaves the server (queries are proxied by connection id via /api/query).
 */
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    return NextResponse.json({ connections: listConnections() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Vault locked / passphrase missing is an expected state, not a 500.
    return NextResponse.json({ connections: [], error: message }, { status: 200 });
  }
}

/** Create a connection in the vault (used by the in-app "new connection" form). */
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.name || !body.host || !body.port) {
      return NextResponse.json(
        { error: "name, host, port required" },
        { status: 400 }
      );
    }
    const safe = addConnection({
      name: body.name,
      driver: "postgres",
      host: body.host,
      port: Number(body.port),
      database: body.database,
      user: body.user,
      password: body.password,
      ssl: !!body.ssl,
      folder: body.folder || undefined,
      timezone: body.timezone || undefined,
      readOnly: !!body.readOnly,
    });
    commitConfig(`pmsql: add connection ${safe.name}`);
    return NextResponse.json({ ok: true, connection: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

/** Edit a connection. Provided fields overwrite; an omitted password is kept. */
export async function PUT(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!getConnection(body.id))
      return NextResponse.json({ error: "unknown connection" }, { status: 404 });
    const safe = updateConnection(body.id, {
      name: body.name,
      host: body.host,
      port: body.port !== undefined ? Number(body.port) : undefined,
      database: body.database,
      user: body.user,
      password: body.password, // "" or undefined = unchanged
      ssl: body.ssl,
      folder: body.folder,
      timezone: body.timezone,
      readOnly: body.readOnly,
    });
    commitConfig(`pmsql: update connection ${safe?.name ?? body.id}`);
    return NextResponse.json({ ok: true, connection: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

/** Delete a connection from the vault. */
export async function DELETE(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = removeConnection(id);
  if (removed) commitConfig(`pmsql: remove connection ${id}`);
  return NextResponse.json({ ok: removed });
}

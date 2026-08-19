import { NextResponse } from "next/server";
import { requireStoreContext } from "@/lib/workspace-context";
import { commitConfig } from "@/lib/config-repo";
import { getConnectionStore } from "@/lib/mode";
import { IS_CLOUD } from "@/lib/mode";

// Reads the vault / cloud DB (fs + crypto / pg) — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = getConnectionStore();

// Vault-git-sync only applies to the single-tenant vault store; cloud persists
// directly in its database.
function commitLocal(msg: string) {
  if (!IS_CLOUD) commitConfig(msg);
}

/**
 * List the caller's connections (passwords stripped). In cloud mode this is
 * scoped to the authenticated user; in local mode it's the single vault.
 */
export async function GET() {
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  try {
    return NextResponse.json({ connections: await store.list(auth) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Vault locked / passphrase missing is an expected state, not a 500.
    return NextResponse.json({ connections: [], error: message }, { status: 200 });
  }
}

/** Create a connection (used by the in-app "new connection" form). */
export async function POST(req: Request) {
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  if (auth.role === "viewer")
    return NextResponse.json({ error: "Viewers can't add connections." }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.name || !body.host || !body.port) {
      return NextResponse.json(
        { error: "name, host, port required" },
        { status: 400 }
      );
    }
    const driver = ["clickhouse", "mysql"].includes(body.driver)
      ? body.driver
      : "postgres";
    const safe = await store.add(auth, {
      name: body.name,
      driver,
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
    commitLocal(`pmsql: add connection ${safe.name}`);
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
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  if (auth.role === "viewer")
    return NextResponse.json({ error: "Viewers can't edit connections." }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const safe = await store.update(auth, body.id, {
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
    if (!safe)
      return NextResponse.json({ error: "unknown connection" }, { status: 404 });
    commitLocal(`pmsql: update connection ${safe.name}`);
    return NextResponse.json({ ok: true, connection: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}

/** Delete a connection. */
export async function DELETE(req: Request) {
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  if (auth.role === "viewer")
    return NextResponse.json({ error: "Viewers can't delete connections." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = await store.remove(auth, id);
  if (removed) commitLocal(`pmsql: remove connection ${id}`);
  return NextResponse.json({ ok: removed });
}

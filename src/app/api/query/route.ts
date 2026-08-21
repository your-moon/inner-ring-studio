import { NextResponse } from "next/server";
import { requireStoreContext } from "@/lib/workspace-context";
import { getConnectionStore } from "@/lib/mode";
import type { AuthContext } from "@/lib/connection-store";
import type { PgConnConfig } from "@/lib/pg-pool";
import { executorFor } from "@/lib/executors";
import { decodeQueryRequest } from "@/lib/executors/request";

// node-postgres needs the Node.js runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = getConnectionStore();

/**
 * Resolve the effective connection config for a request. Preferred path: the
 * browser sends only a `connectionId`, and we look the record up in the
 * server-side vault so the password never leaves the server. Fallback: an
 * inline `connection` object (used by the manual "new connection" form before a
 * vault entry exists).
 */
async function resolveConnection(
  body: { connectionId?: string; connection?: PgConnConfig },
  auth: AuthContext
): Promise<PgConnConfig> {
  if (body.connectionId) {
    // Scoped by the caller — in cloud mode you can only resolve your own.
    const c = await store.get(auth, body.connectionId);
    if (!c) throw new Error(`Unknown connection id: ${body.connectionId}`);
    return {
      host: c.host,
      port: c.port,
      database: c.database,
      user: c.user,
      password: c.password,
      ssl: c.ssl,
      timezone: c.timezone,
      // Viewers always run read-only, regardless of the connection's own flag.
      readOnly: c.readOnly || auth.role === "viewer",
      driver: c.driver,
    };
  }
  if (body.connection?.host && body.connection?.port) return body.connection;
  throw new Error("Missing connectionId or connection host/port");
}

// Always refuse the cloud-metadata address. Broader private-range blocking is
// gated behind the vault milestone (dev connects to localhost/Docker).
function assertConnectable(host: string): void {
  if (host === "169.254.169.254") {
    throw new Error("Refusing to connect to link-local metadata address");
  }
}

export async function POST(req: Request) {
  const auth = await requireStoreContext();
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json();
    const conn = await resolveConnection(body, auth);
    assertConnectable(conn.host);

    // Decode the request protocol once, then dispatch to the per-dialect
    // executor. Each executor owns its dialect's execution quirks.
    const request = decodeQueryRequest(body);
    if (request.kind === "error") {
      return NextResponse.json({ error: request.message }, { status: 400 });
    }

    const executor = executorFor(conn.driver);
    switch (request.kind) {
      case "close":
        await executor.closeCursor(conn, request.cursorId);
        return NextResponse.json({ ok: true });
      case "fetchMore":
        return NextResponse.json(
          await executor.fetchMore(conn, request.cursorId, request.pageSize)
        );
      case "statements":
        return NextResponse.json(
          await executor.statements(conn, request.statements)
        );
      case "paginate":
        return NextResponse.json(
          await executor.paginate(conn, request.sql, request.pageSize)
        );
      case "single":
        return NextResponse.json(
          await executor.single(conn, request.sql)
        );
    }
    // Unreachable: decodeQueryRequest returns one of the handled kinds.
    return NextResponse.json({ error: "Unhandled request" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

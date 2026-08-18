import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getConnection, listConnections, updateConnection } from "@/lib/vault";
import {
  closePool,
  poolStatus,
  testConnection,
  type PgConnConfig,
} from "@/lib/pg-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configOf(c: {
  host: string;
  port: number;
  database?: string;
  user?: string;
  ssl?: boolean;
  password?: string;
  timezone?: string;
  readOnly?: boolean;
}): PgConnConfig {
  return {
    host: c.host,
    port: c.port,
    database: c.database,
    user: c.user,
    ssl: c.ssl,
    password: c.password,
    timezone: c.timezone,
    readOnly: c.readOnly,
  };
}

/** Connection-manager status: which connections have a live pool. */
export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const connections = listConnections().map((c) => ({
    id: c.id,
    name: c.name,
    driver: c.driver,
    folder: c.folder,
    readOnly: !!c.readOnly,
    status: poolStatus(configOf(c)), // password not needed for the pool key
  }));
  return NextResponse.json({ connections });
}

/** Actions: disconnect (close pool) or test/retry (SELECT 1). */
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const body = await req.json().catch(() => ({}));
  const conn = body.connectionId ? getConnection(body.connectionId) : undefined;
  if (!conn) {
    return NextResponse.json({ error: "unknown connection" }, { status: 400 });
  }

  if (body.action === "disconnect") {
    await closePool(configOf(conn));
    return NextResponse.json({ ok: true, status: poolStatus(configOf(conn)) });
  }
  if (body.action === "test" || body.action === "retry") {
    const result = await testConnection(configOf(conn));
    return NextResponse.json({
      ...result,
      status: poolStatus(configOf(conn)),
    });
  }
  if (body.action === "readonly") {
    // Close the current pool so the new read-only/read-write mode takes effect
    // (mode is applied at pool creation via Postgres server options).
    await closePool(configOf(conn));
    updateConnection(conn.id, { readOnly: !!body.value });
    return NextResponse.json({ ok: true, readOnly: !!body.value });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

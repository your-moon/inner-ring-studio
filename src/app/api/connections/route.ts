import { NextResponse } from "next/server";
import { listConnections } from "@/lib/vault";

// Reads the encrypted vault (fs + crypto) — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List connections stored in the server-side vault, with passwords stripped.
 * The browser uses these to populate its connection list; the actual password
 * never leaves the server (queries are proxied by connection id via /api/query).
 */
export async function GET() {
  try {
    return NextResponse.json({ connections: listConnections() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Vault locked / passphrase missing is an expected state, not a 500.
    return NextResponse.json({ connections: [], error: message }, { status: 200 });
  }
}
